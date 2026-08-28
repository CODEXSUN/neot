import { AppError } from "@neot/framework/errors";
import { ok } from "@neot/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireNEOTActor, requireNEOTUserDirectory } from "../../request-context.js";
import { publishMessagingEvent } from "./messaging.events.js";
import { MessagingRepository } from "./messaging.repository.js";
import type { MessagingContact } from "./messaging.types.js";

const repository = new MessagingRepository();
const idParams = z.object({ id: z.string().length(8) }).strict();
const attachmentSchema = z.object({
  dataUrl: z.string().startsWith("data:").max(14_000_000),
  kind: z.enum(["file", "image", "voice"]),
  name: z.string().min(1).max(240),
  size: z.number().int().nonnegative().max(10 * 1024 * 1024),
  type: z.string().min(1).max(160)
}).strict();

export async function registerMessagingRoutes(app: FastifyInstance) {
  app.get("/messaging/contacts", async (request) => {
    const query = z.object({ search: z.string().optional() }).parse(request.query);
    const actor = requireNEOTActor();
    const search = query.search?.trim().toLocaleLowerCase() ?? "";
    const users = await requireNEOTUserDirectory().list();
    return ok(users.filter((user) => user.uuid !== actor.id)
      .filter((user) => !search || `${user.name} ${user.email}`.toLocaleLowerCase().includes(search))
      .map(({ email, name, uuid }) => ({ email, name, uuid })).slice(0, 30), { requestId: request.id });
  });
  app.get("/messaging/conversations", async (request) =>
    ok(await repository.list(requireNEOTActor().id), { requestId: request.id }));
  app.post("/messaging/conversations", async (request) => {
    const input = z.object({ memberIds: z.array(z.string().min(1)).min(1), title: z.string().max(180).optional(), type: z.enum(["direct", "group"]).default("direct") }).strict().parse(request.body);
    const actor = await actorContact();
    const users = await requireNEOTUserDirectory().list();
    const requested = new Set(input.memberIds.filter((id) => id !== actor.uuid));
    const members: MessagingContact[] = [actor, ...users.filter((user) => requested.has(user.uuid)).map(({ email, name, uuid }) => ({ email, name, uuid }))];
    if (members.length !== requested.size + 1) throw AppError.validation("One or more users were not found.");
    if (input.type === "direct" && members.length !== 2) throw AppError.validation("Direct conversations require one contact.");
    if (input.type === "direct") {
      const existing = await repository.findDirect(actor.uuid, members[1]!.uuid);
      if (existing) return ok(existing, { requestId: request.id });
    }
    return ok(await repository.create(input.type, input.title?.trim() ?? "", actor, members), { requestId: request.id });
  });
  app.get("/messaging/conversations/:id/messages", async (request) => {
    const { id } = idParams.parse(request.params);
    return ok(await repository.messages(id, requireNEOTActor().id), { requestId: request.id });
  });
  app.post("/messaging/conversations/:id/messages", { bodyLimit: 15 * 1024 * 1024 }, async (request) => {
    const { id } = idParams.parse(request.params);
    const input = z.object({ attachment: attachmentSchema.nullable().default(null), clientMessageId: z.string().min(1).max(80), content: z.string().trim().min(1).max(20_000), mentionIds: z.array(z.string().min(1)).default([]) }).strict().parse(request.body);
    const validUsers = new Set((await requireNEOTUserDirectory().list()).map((user) => user.uuid));
    const mentionIds = [...new Set(input.mentionIds)].filter((userId) => validUsers.has(userId));
    const message = await repository.send(id, await actorContact(), input.content, input.clientMessageId, mentionIds, input.attachment);
    publishMessagingEvent({ kind: "message", memberIds: await repository.memberIds(id), message });
    return ok(message, { requestId: request.id });
  });
  app.post("/messaging/conversations/:id/messages/:messageId/reaction", async (request) => {
    const params = z.object({ id: z.string().length(8), messageId: z.string().length(8) }).strict().parse(request.params);
    const { emoji } = z.object({ emoji: z.string().trim().min(1).max(32).nullable() }).strict().parse(request.body);
    const message = await repository.react(params.id, params.messageId, await actorContact(), emoji);
    publishMessagingEvent({ kind: "message", memberIds: await repository.memberIds(params.id), message });
    return ok(message, { requestId: request.id });
  });
  app.post("/messaging/conversations/:id/read", async (request) => {
    const { id } = idParams.parse(request.params);
    const { sequence } = z.object({ sequence: z.number().int().nonnegative() }).strict().parse(request.body);
    const actorId = requireNEOTActor().id;
    if (await repository.markRead(id, actorId, sequence)) {
      publishMessagingEvent({
        conversationId: id,
        kind: "read",
        memberIds: await repository.memberIds(id),
        readerId: actorId,
        sequence
      });
    }
    return ok({ read: true }, { requestId: request.id });
  });
}

async function actorContact(): Promise<MessagingContact> {
  const actor = requireNEOTActor();
  const user = (await requireNEOTUserDirectory().list()).find((candidate) => candidate.uuid === actor.id);
  if (!user) throw AppError.unauthorized("The signed-in user is unavailable.");
  return { email: user.email, name: user.name, uuid: user.uuid };
}
