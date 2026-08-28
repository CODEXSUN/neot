import "@neot/framework/api";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { bootstrapNEOTDatabase, runWithNEOTDatabase } from "./database/index.js";
import type { NEOTDatabase } from "./database/index.js";
import { projectManagerModule } from "./modules/project-manager/index.js";
import { taskManagerModule } from "./modules/task-manager/index.js";
import { syncModule } from "./modules/sync/index.js";
import { planningModule } from "./modules/planning/index.js";
import { orchestrationModule } from "./modules/orchestration/index.js";
import { skillsModule } from "./modules/skills/index.js";
import { telegramSupportModule } from "./modules/telegram-support/index.js";
import { honeyModule } from "./modules/honey/index.js";
import { notificationModule } from "./modules/notification/index.js";
import { ideasModule } from "./modules/ideas/index.js";
import { messagingModule } from "./modules/messaging/index.js";
import { learningModule } from "./modules/learning/index.js";
import {
  runWithNEOTActor,
  runWithNEOTUserDirectory,
  type NEOTActor,
  type NEOTUserDirectory
} from "./request-context.js";

export const neotApiModuleKeys = [
  ideasModule.key,
  messagingModule.key,
  learningModule.key,
  projectManagerModule.key,
  taskManagerModule.key,
  planningModule.key,
  orchestrationModule.key,
  skillsModule.key,
  telegramSupportModule.key,
  honeyModule.key,
  notificationModule.key,
  syncModule.key
] as const;

export type NEOTHostRequestContext = {
  actor: NEOTActor;
  database: Kysely<NEOTDatabase>;
  users: NEOTUserDirectory;
};

export type NEOTHostAdapter = {
  authorize?(input: {
    context: NEOTHostRequestContext;
    request: FastifyRequest;
  }): Promise<void> | void;
  resolve(request: FastifyRequest): Promise<NEOTHostRequestContext> | NEOTHostRequestContext;
  resolveCloudSync?(
    request: FastifyRequest
  ): Promise<NEOTHostRequestContext> | NEOTHostRequestContext;
  resolvePublicWebhook?(
    request: FastifyRequest
  ): Promise<NEOTHostRequestContext> | NEOTHostRequestContext;
};

export async function registerNEOTApiForHost(app: FastifyInstance, adapter: NEOTHostAdapter) {
  await app.register(async (neotApp) => {
    const contexts = new WeakMap<FastifyRequest, NEOTHostRequestContext>();
    neotApp.addHook("onRequest", (request, _reply, done) => {
      const resolve =
        request.url.includes("/telegram/webhook") && adapter.resolvePublicWebhook
          ? adapter.resolvePublicWebhook
          : request.url.includes("/sync/cloud/") && adapter.resolveCloudSync
            ? adapter.resolveCloudSync
            : adapter.resolve;
      void Promise.resolve(resolve.call(adapter, request))
        .then((context) => {
          contexts.set(request, context);
          runWithNEOTDatabase(context.database, () =>
            runWithNEOTActor(context.actor, () => runWithNEOTUserDirectory(context.users, done))
          );
        })
        .catch((error: unknown) => done(error as Error));
    });
    neotApp.addHook("preHandler", async (request) => {
      const context = contexts.get(request);
      if (!context) throw new Error("NEOT host request context is unavailable.");
      await bootstrapNEOTDatabase(context.database);
      await adapter.authorize?.({ context, request });
    });
    await projectManagerModule.register({ app: neotApp });
    await ideasModule.register({ app: neotApp });
    await messagingModule.register({ app: neotApp });
    await learningModule.register({ app: neotApp });
    await taskManagerModule.register({ app: neotApp });
    await planningModule.register({ app: neotApp });
    await orchestrationModule.register({ app: neotApp });
    await skillsModule.register({ app: neotApp });
    await telegramSupportModule.register({ app: neotApp });
    await honeyModule.register({ app: neotApp });
    await notificationModule.register({ app: neotApp });
    await syncModule.register({ app: neotApp });
  });
}
