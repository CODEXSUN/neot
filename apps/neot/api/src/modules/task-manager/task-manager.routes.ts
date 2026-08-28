import type { FastifyInstance, FastifyRequest } from "fastify";
import { ok } from "@neot/framework/http";
import { z } from "zod";
import { requireNEOTActor } from "../../request-context.js";
import { TaskManagerService } from "./task-manager.service.js";

const service = new TaskManagerService();
const scopeKey = "super-admin";
const idParamsSchema = z.object({ id: z.string().min(1) }).strict();
const todoInputSchema = z
  .object({
    category: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    groupName: z.string().optional(),
    projectId: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    title: z.string().min(1)
  })
  .strict();
const lookupInputSchema = z
  .object({
    kind: z.enum(["category", "group", "priority", "status"]),
    name: z.string().min(1)
  })
  .strict();

export async function registerTaskManagerRoutes(app: FastifyInstance) {
  app.get("/task-manager/todos", async (request) =>
    ok(await service.list(scopeKey, actor(request)), { requestId: request.id })
  );
  app.get("/task-manager/lookups", async (request) =>
    ok(await service.listLookups(scopeKey), { requestId: request.id })
  );
  app.post("/task-manager/lookups", async (request) => {
    const body = lookupInputSchema.parse(request.body);
    return ok(await service.createLookup(scopeKey, body.kind, body.name, actor(request)), {
      requestId: request.id
    });
  });
  app.post("/task-manager/todos", async (request) =>
    ok(await service.create(scopeKey, todoInputSchema.parse(request.body), actor(request)), {
      requestId: request.id
    })
  );
  app.post("/task-manager/todos/reorder", async (request) =>
    ok(
      await service.reorder(
        scopeKey,
        z
          .object({ orderedIds: z.array(z.string()) })
          .strict()
          .parse(request.body).orderedIds,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.put("/task-manager/todos/:id", async (request) =>
    ok(
      await service.update(
        scopeKey,
        idParamsSchema.parse(request.params).id,
        todoInputSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/task-manager/todos/:id/status", async (request) =>
    ok(
      await service.status(
        scopeKey,
        idParamsSchema.parse(request.params).id,
        z
          .object({ status: z.string().min(1) })
          .strict()
          .parse(request.body).status,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.delete("/task-manager/todos/:id", async (request) =>
    ok(await service.delete(scopeKey, idParamsSchema.parse(request.params).id, actor(request)), {
      requestId: request.id
    })
  );
}

function actor(request: FastifyRequest) {
  return requireNEOTActor().email?.trim() || requireNEOTActor().id || request.id;
}
