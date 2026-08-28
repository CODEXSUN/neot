import { ok } from "@neot/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireNEOTActor } from "../../request-context.js";
import { PlanningRepository } from "./planning.repository.js";

const repository = new PlanningRepository();
const uuid = z.string().regex(/^[a-f0-9]{8}$/u);
const recordKind = z.enum(["project", "issue", "task", "activity", "review"]);
const scene = z
  .object({
    appState: z.record(z.string(), z.unknown()).optional(),
    elements: z.array(z.unknown()),
    files: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
const inputFields = z.object({
    description: z.string().max(4000).default(""),
    projectUuid: uuid.nullable().default(null),
    recordKind: recordKind.optional(),
    recordUuid: uuid.optional(),
    title: z.string().trim().min(1).max(240),
  })
  .strict();
const input = inputFields
  .refine(
    (value) => Boolean(value.recordKind) === Boolean(value.recordUuid),
    "recordKind and recordUuid must be supplied together.",
  );

export async function registerPlanningRoutes(app: FastifyInstance) {
  app.get("/planning/boards", async (request) => {
    const query = z
      .object({
        projectUuid: uuid.optional(),
        recordKind: recordKind.optional(),
        recordUuid: uuid.optional(),
      })
      .parse(request.query);
    const record =
      query.recordKind && query.recordUuid
        ? { kind: query.recordKind, uuid: query.recordUuid }
        : query.projectUuid
          ? { kind: "project" as const, uuid: query.projectUuid }
          : undefined;
    return ok(await repository.list(record), {
      requestId: request.id,
    });
  });
  app.get("/planning/boards/:uuid", async (request) =>
    ok(await repository.find(z.object({ uuid }).parse(request.params).uuid), {
      requestId: request.id,
    }),
  );
  app.post("/planning/boards", async (request) =>
    ok(await repository.create(input.parse(request.body), actor()), {
      requestId: request.id,
    }),
  );
  app.put(
    "/planning/boards/:uuid",
    { bodyLimit: 16 * 1024 * 1024 },
    async (request) =>
      ok(
        await repository.update(
          z.object({ uuid }).parse(request.params).uuid,
          inputFields
            .partial()
            .extend({ scene: scene.optional() })
            .parse(request.body),
          actor(),
        ),
        { requestId: request.id },
      ),
  );
  app.delete("/planning/boards/:uuid", async (request) =>
    ok(
      await repository.delete(
        z.object({ uuid }).parse(request.params).uuid,
        actor(),
      ),
      { requestId: request.id },
    ),
  );
  app.post("/planning/boards/:uuid/links", async (request) => {
    const params = z.object({ uuid }).parse(request.params);
    const body = z
      .object({ recordKind, recordUuid: uuid })
      .strict()
      .parse(request.body);
    return ok(
      await repository.link(
        params.uuid,
        body.recordKind,
        body.recordUuid,
        actor(),
      ),
      { requestId: request.id },
    );
  });
  app.get("/planning/boards/:uuid/comments", async (request) =>
    ok(
      await repository.comments(z.object({ uuid }).parse(request.params).uuid),
      { requestId: request.id },
    ),
  );
  app.post("/planning/boards/:uuid/comments", async (request) => {
    const params = z.object({ uuid }).parse(request.params);
    const body = z
      .object({
        body: z.string().trim().min(1).max(4000),
        elementId: z.string().max(64).optional(),
      })
      .strict()
      .parse(request.body);
    return ok(
      await repository.createComment(params.uuid, body, actor()),
      { requestId: request.id },
    );
  });
  app.put("/planning/comments/:uuid/status", async (request) =>
    ok(
      await repository.setCommentResolved(
        z.object({ uuid }).parse(request.params).uuid,
        z.object({ resolved: z.boolean() }).strict().parse(request.body)
          .resolved,
        actor(),
      ),
      { requestId: request.id },
    ),
  );
  app.post("/planning/comments/:uuid/reactions", async (request) =>
    ok(
      await repository.toggleReaction(
        z.object({ uuid }).parse(request.params).uuid,
        z
          .object({ reaction: z.string().trim().min(1).max(24) })
          .strict()
          .parse(request.body).reaction,
        actor(),
      ),
      { requestId: request.id },
    ),
  );
}

function actor() {
  const value = requireNEOTActor();
  return value.email?.trim() || value.id;
}
