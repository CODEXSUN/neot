import { ok } from "@neot/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { NotificationService } from "./notification.service.js";

const service = new NotificationService();
const paramsSchema = z.object({ uuid: z.string().length(32) });
const createSchema = z
  .object({
    actionUrl: z.string().trim().max(500).nullable().optional(),
    body: z.string().trim().min(1).max(1000),
    category: z.string().trim().min(1).max(80),
    channels: z
      .array(z.enum(["email", "realtime"]))
      .max(2)
      .default(["realtime"]),
    idempotencyKey: z.string().trim().min(8).max(200),
    recipientActorId: z.string().trim().min(1).max(160),
    recipientEmail: z.string().email().nullable().optional(),
    title: z.string().trim().min(1).max(220)
  })
  .strict();

export function registerNotificationRoutes(app: FastifyInstance) {
  app.get("/notifications", async (request) =>
    ok(await service.inbox(), { requestId: request.id })
  );
  app.post("/notifications", async (request) =>
    ok(await service.create(createSchema.parse(request.body)), { requestId: request.id })
  );
  app.put("/notifications/:uuid/read", async (request) => {
    const { uuid } = paramsSchema.parse(request.params);
    return ok(await service.markRead(uuid), { requestId: request.id });
  });
  app.get("/notifications/queue/summary", async (request) =>
    ok(await service.queueSummary(), { requestId: request.id })
  );
  app.get("/notifications/queue/jobs", async (request) =>
    ok(await service.queueJobs(), { requestId: request.id })
  );
  app.post("/notifications/queue/jobs/:uuid/retry", async (request) => {
    const { uuid } = paramsSchema.parse(request.params);
    return ok(await service.retryJob(uuid), { requestId: request.id });
  });
}
