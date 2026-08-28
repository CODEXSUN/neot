import type { FastifyInstance } from "fastify";
import { runHealthChecks, type HealthCheck } from "../health/index.js";
import { ok } from "../http/index.js";

export function registerHealthRoute(app: FastifyInstance, checks: HealthCheck[]) {
  app.get("/health", async (request, reply) => {
    const result = await runHealthChecks(checks);
    if (result.status === "down") {
      reply.code(503);
    }
    return ok(result, {
      requestId: request.id,
      ...(request.correlationId ? { correlationId: request.correlationId } : {}),
      ...(request.tenantId ? { tenantId: request.tenantId } : {})
    });
  });
}
