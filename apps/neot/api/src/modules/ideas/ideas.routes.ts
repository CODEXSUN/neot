import { AppError } from "@neot/framework/errors";
import { ok } from "@neot/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireNEOTActor, requireNEOTUserDirectory } from "../../request-context.js";
import { IdeasRepository } from "./ideas.repository.js";
import { hasValidIdeaImageAccess, ideaImageLimitBytes } from "./ideas.storage.js";

const repository = new IdeasRepository();
const uuid = z.string().regex(/^[a-f0-9]{8}$/u);
const params = z.object({ uuid });
const imageParams = z.object({ uuid, attachmentUuid: uuid });
const imageQuery = z.object({ access: z.string().regex(/^[a-f0-9]{64}$/u) });
const attachmentHeaders = z.object({
  "x-file-name": z.string().min(1),
  "x-file-type": z.string().min(1)
});
const color = z.string().regex(/^#[0-9a-f]{6}$/iu);
const ideaInput = z
  .object({
    title: z.string().trim().min(1).max(240),
    excerpt: z.string().max(500).default(""),
    contentHtml: z.string().max(2_000_000).default(""),
    category: z.string().trim().min(1).max(80).default("General"),
    categoryColor: color.default("#2563eb"),
    tags: z.array(z.string().trim().min(1).max(48)).max(20).default([]),
    assigneeUuids: z.array(uuid).max(20).default([]),
    projectUuids: z.array(uuid).max(20).default([]),
    status: z.string().trim().min(1).max(48).default("open"),
    statusColor: color.default("#16a34a"),
    visibility: z.enum(["private", "public"]).default("private")
  })
  .strict();

export async function registerIdeasRoutes(app: FastifyInstance) {
  if (!app.hasContentTypeParser("application/octet-stream")) {
    app.addContentTypeParser(
      "application/octet-stream",
      { parseAs: "buffer", bodyLimit: ideaImageLimitBytes },
      (_request, body, done) => done(null, body)
    );
  }
  app.get("/ideas", async (request) =>
    ok(await repository.list(actor()), { requestId: request.id })
  );
  app.get("/ideas/users", async (request) =>
    ok(await requireNEOTUserDirectory().list(), { requestId: request.id })
  );
  app.get("/ideas/:uuid", async (request) =>
    ok(await repository.find(params.parse(request.params).uuid, actor()), { requestId: request.id })
  );
  app.post("/ideas", { bodyLimit: 3 * 1024 * 1024 }, async (request) => {
    const input = ideaInput.parse(request.body);
    await validateAssignees(input.assigneeUuids);
    return ok(await repository.create(input, actor()), { requestId: request.id });
  });
  app.put("/ideas/:uuid", { bodyLimit: 3 * 1024 * 1024 }, async (request) => {
    const input = ideaInput.partial().parse(request.body);
    await validateAssignees(input.assigneeUuids);
    return ok(await repository.update(params.parse(request.params).uuid, input, actor()), {
      requestId: request.id
    });
  });
  app.delete("/ideas/:uuid", async (request) =>
    ok(await repository.remove(params.parse(request.params).uuid, actor()), {
      requestId: request.id
    })
  );
  app.get("/ideas/:uuid/comments", async (request) =>
    ok(await repository.comments(params.parse(request.params).uuid, actor()), {
      requestId: request.id
    })
  );
  app.post("/ideas/:uuid/comments", async (request) => {
    const body = z
      .object({
        bodyHtml: z.string().trim().min(1).max(20_000),
        parentUuid: uuid.nullable().default(null)
      })
      .strict()
      .parse(request.body);
    return ok(
      await repository.addComment(
        params.parse(request.params).uuid,
        body.bodyHtml,
        body.parentUuid,
        actor()
      ),
      { requestId: request.id }
    );
  });
  app.post("/ideas/:uuid/like", async (request) =>
    ok(await repository.toggleLike("idea", params.parse(request.params).uuid, actor()), {
      requestId: request.id
    })
  );
  app.post("/idea-comments/:uuid/like", async (request) =>
    ok(await repository.toggleLike("comment", params.parse(request.params).uuid, actor()), {
      requestId: request.id
    })
  );
  app.post("/idea-comments/:uuid/reaction", async (request) => {
    const body = z
      .object({ vote: z.enum(["up", "down"]) })
      .strict()
      .parse(request.body);
    return ok(
      await repository.toggleReaction(
        "comment",
        params.parse(request.params).uuid,
        body.vote,
        actor()
      ),
      { requestId: request.id }
    );
  });
  app.post("/ideas/:uuid/reaction", async (request) => {
    const body = z
      .object({ vote: z.enum(["up", "down"]) })
      .strict()
      .parse(request.body);
    return ok(
      await repository.toggleReaction(
        "idea",
        params.parse(request.params).uuid,
        body.vote,
        actor()
      ),
      { requestId: request.id }
    );
  });
  app.put("/ideas/:uuid/poll", async (request) => {
    const input = z
      .object({
        question: z.string().trim().min(1).max(300),
        options: z.array(z.string().trim().min(1).max(120)).min(2).max(10),
        multipleChoice: z.boolean().default(false)
      })
      .strict()
      .parse(request.body);
    return ok(await repository.savePoll(params.parse(request.params).uuid, input, actor()), {
      requestId: request.id
    });
  });
  app.post("/ideas/:uuid/poll/votes", async (request) => {
    const input = z
      .object({ optionId: z.string().max(40) })
      .strict()
      .parse(request.body);
    return ok(await repository.vote(params.parse(request.params).uuid, input.optionId, actor()), {
      requestId: request.id
    });
  });
  app.post("/ideas/:uuid/attachments", { bodyLimit: ideaImageLimitBytes }, async (request) => {
    if (!Buffer.isBuffer(request.body)) throw new Error("Idea image request body must be binary.");
    const headers = attachmentHeaders.parse(request.headers);
    const input = {
      data: request.body,
      name: decodeURIComponent(headers["x-file-name"]),
      type: headers["x-file-type"]
    };
    return ok(await repository.addAttachment(params.parse(request.params).uuid, input, actor()), {
      requestId: request.id
    });
  });
  app.get("/ideas/:uuid/attachments/:attachmentUuid/image", async (request, reply) => {
    const value = imageParams.parse(request.params);
    const { access } = imageQuery.parse(request.query);
    if (!hasValidIdeaImageAccess(value.uuid, value.attachmentUuid, access)) {
      throw AppError.unauthorized("The idea image link is invalid.");
    }
    const image = await repository.attachmentImage(value.uuid, value.attachmentUuid);
    return reply
      .header("cache-control", "private, max-age=3600")
      .header("content-type", image.mimeType)
      .header("content-length", String(image.data.byteLength))
      .send(image.data);
  });
  app.put("/ideas/:uuid/drawing", { bodyLimit: 16 * 1024 * 1024 }, async (request) => {
    const scene = z
      .object({
        elements: z.array(z.unknown()),
        appState: z.record(z.string(), z.unknown()).optional(),
        files: z.record(z.string(), z.unknown()).optional()
      })
      .passthrough()
      .parse(request.body);
    return ok(await repository.saveDrawing(params.parse(request.params).uuid, scene, actor()), {
      requestId: request.id
    });
  });
}

function actor() {
  const value = requireNEOTActor();
  return value.email?.trim() || value.id;
}

async function validateAssignees(assigneeUuids: string[] | undefined) {
  if (!assigneeUuids?.length) return;
  const activeUsers = await requireNEOTUserDirectory().list();
  const activeUuids = new Set(activeUsers.map((user) => user.uuid));
  if (assigneeUuids.some((uuid) => !activeUuids.has(uuid))) {
    throw AppError.validation("Assignees must be selected from active Identity users.");
  }
}
