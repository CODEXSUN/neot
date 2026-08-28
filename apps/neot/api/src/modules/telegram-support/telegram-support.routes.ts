import { ok } from "@neot/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TelegramSupportService } from "./telegram-support.service.js";

const service = new TelegramSupportService();
export async function registerTelegramSupportRoutes(app: FastifyInstance) {
  app.get("/telegram/status", async (request) => ok(await service.status(), { requestId: request.id }));
  app.post("/telegram/connect", async (request) => ok(await service.beginConnection(), { requestId: request.id }));
  app.post("/telegram/connect/password", async (request) => ok(await service.submitPassword(z.object({ password: z.string().min(1).max(256) }).strict().parse(request.body).password), { requestId: request.id }));
  app.post("/telegram/disconnect", async (request) => ok(await service.disconnect(), { requestId: request.id }));
  app.get("/telegram/messages", async (request) => ok(await service.messages(), { requestId: request.id }));
  app.post("/telegram/messages", async (request) => ok(await service.send(z.object({ body: z.string().min(1).max(4096) }).strict().parse(request.body).body), { requestId: request.id }));
  app.post("/telegram/webhook", async (request) => ok(await service.webhook(request.headers["x-telegram-bot-api-secret-token"] as string | undefined, request.body as never), { requestId: request.id }));
}
