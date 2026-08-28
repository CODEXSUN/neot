import { createApiApp, registerHealthRoute, registerRequestLogging } from "@neot/framework/api";
import { AppError } from "@neot/framework/errors";
import type { HealthCheck } from "@neot/framework/health";
import { registerModules } from "@neot/framework/modules";
import {
  bootstrapNEOTDatabase,
  configureNotificationRuntime,
  neotApiModuleKeys,
  registerNEOTApiForHost,
  subscribeMessagingEvents,
  subscribeNotificationEvents
} from "@neot/neot-api";
import type { NEOTDatabase } from "@neot/neot-api";
import type { Kysely } from "kysely";
import { Server as SocketServer } from "socket.io";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { bootstrapPlatformDatabase, closePlatformDatabase } from "./database/platform-database.js";
import { getPlatformDatabase } from "./database/platform-database.js";
import { identityContext } from "./auth/identity-context.js";
import { env } from "./env.js";
import { verifyAuthToken } from "./auth/jwt.js";
import { permissionModule } from "./modules/permission/index.js";
import { rolePermissionModule } from "./modules/role-permission/index.js";
import { roleModule } from "./modules/role/index.js";
import { userRoleModule } from "./modules/user-role/index.js";
import { userModule, userReferenceContract } from "./modules/user/index.js";
import { registerNEOTAddons } from "./addons/addon-host.js";
import { closeFileManagerDatabase, fileManagerApiModuleKeys } from "./addons/file-manager-host.js";

const modules = [userModule, roleModule, permissionModule, userRoleModule, rolePermissionModule];

export async function createApp() {
  console.info("[neot.boot] bootstrap started");
  await bootstrapPlatformDatabase();
  const database = getPlatformDatabase() as unknown as Kysely<NEOTDatabase>;
  await bootstrapNEOTDatabase(database);
  const closeNotifications = await configureNotificationRuntime({
    database,
    email: {
      fromEmail: env.MAIL_FROM_EMAIL,
      fromName: env.MAIL_FROM_NAME,
      host: env.MAIL_SMTP_HOST,
      password: env.MAIL_SMTP_PASSWORD,
      port: env.MAIL_SMTP_PORT,
      secure: env.MAIL_SMTP_SECURE === "1",
      username: env.MAIL_SMTP_USERNAME
    },
    redisUrl: env.REDIS_URL
  });

  const app = await createApiApp({
    appName: "NEOT API",
    cookieSecret: env.JWT_SECRET,
    corsOrigins: platformWebOrigins(),
    environment: env.NODE_ENV,
    shutdownHooks: [closeNotifications, closeFileManagerDatabase, closePlatformDatabase],
    tenantContext: false
  });
  registerNotificationSocket(app);
  registerMessagingSocket(app);
  const healthChecks: HealthCheck[] = [
    {
      name: "neot-api",
      check: () => ({
        details: {
          database: env.DB_NAME,
          modules: [
            ...modules.map((module) => module.key),
            ...neotApiModuleKeys,
            ...fileManagerApiModuleKeys,
            "blogs"
          ],
          runtime: "single-client"
        },
        status: "ok"
      })
    }
  ];

  registerRequestLogging(app);
  registerHealthRoute(app, healthChecks);
  await registerAuthRoutes(app);
  await registerModules(
    modules,
    { app },
    {
      onRegister: (module) => console.info(`[module.register] ${module.key}`),
      onReady: (module) => console.info(`[module.ready] ${module.key}`)
    }
  );
  await registerNEOTAddons(app);
  await app.register(
    async (neotApp) =>
      registerNEOTApiForHost(neotApp, {
        async authorize({ request }) {
          if (
            request.url.includes("/sync/cloud/") ||
            request.url.includes("/telegram/webhook") ||
            isIdeaImageRequest(request)
          )
            return;
          await identityContext(request).authorize(neotPermission(request));
        },
        async resolve(request) {
          if (isIdeaImageRequest(request)) {
            return {
              actor: { id: "neot-idea-image", permissions: [], roles: ["system"] },
              database: getPlatformDatabase() as unknown as Kysely<NEOTDatabase>,
              users: userReferenceContract(getPlatformDatabase())
            };
          }
          const context = identityContext(request);
          const actor = await context.actorUser();
          if (!actor) throw AppError.unauthorized("Session expired. Please sign in again.");
          return {
            actor: {
              email: actor.email,
              id: actor.uuid,
              permissions: [],
              roles: [actor.role]
            },
            database: context.database as unknown as Kysely<NEOTDatabase>,
            users: userReferenceContract(context.database)
          };
        },
        resolveCloudSync() {
          return {
            actor: {
              id: "neot-cloud-sync",
              permissions: [],
              roles: ["system"]
            },
            database: getPlatformDatabase() as unknown as Kysely<NEOTDatabase>,
            users: userReferenceContract(getPlatformDatabase())
          };
        },
        resolvePublicWebhook() {
          return {
            actor: { id: "telegram-webhook", permissions: [], roles: ["system"] },
            database: getPlatformDatabase() as unknown as Kysely<NEOTDatabase>,
            users: userReferenceContract(getPlatformDatabase())
          };
        }
      }),
    { prefix: "/api/neot" }
  );
  console.info("[neot.boot] bootstrap completed");

  return app;
}

function isIdeaImageRequest(request: { method: string; url: string }) {
  return (
    request.method === "GET" &&
    /(?:^|\/api\/neot)\/ideas\/[a-f0-9]{8}\/attachments\/[a-f0-9]{8}\/image(?:\?|$)/u.test(
      request.url
    )
  );
}

function registerNotificationSocket(app: Awaited<ReturnType<typeof createApiApp>>) {
  const io = new SocketServer(app.server, {
    cors: { credentials: true, origin: platformWebOrigins() },
    path: "/api/neot/notifications/socket.io"
  });
  io.use((socket, next) => {
    const authorization = String(
      socket.handshake.auth.token ?? socket.handshake.headers.authorization ?? ""
    );
    const token = authorization.replace(/^Bearer\s+/iu, "");
    const actor = verifyAuthToken(token);
    if (!actor) return next(new Error("Notification socket authentication failed."));
    socket.data.actorId = actor.userId;
    socket.join(`actor:${actor.userId}`);
    next();
  });
  const unsubscribe = subscribeNotificationEvents((event) => {
    io.to(`actor:${event.actorId}`).emit("notification.created", event);
  });
  app.addHook("onClose", async () => {
    unsubscribe();
    await io.close();
  });
}

function registerMessagingSocket(app: Awaited<ReturnType<typeof createApiApp>>) {
  const io = new SocketServer(app.server, {
    cors: { credentials: true, origin: platformWebOrigins() },
    path: "/api/neot/messaging/socket.io"
  });
  io.use((socket, next) => {
    const authorization = String(
      socket.handshake.auth.token ?? socket.handshake.headers.authorization ?? ""
    );
    const actor = verifyAuthToken(authorization.replace(/^Bearer\s+/iu, ""));
    if (!actor) return next(new Error("Messenger socket authentication failed."));
    socket.data.actorId = actor.userId;
    socket.join(`messaging:${actor.userId}`);
    next();
  });
  const unsubscribe = subscribeMessagingEvents((event) => {
    for (const actorId of event.memberIds) {
      if (event.kind === "message") {
        io.to(`messaging:${actorId}`).emit("message.created", event.message);
      } else {
        io.to(`messaging:${actorId}`).emit("conversation.read", event);
      }
    }
  });
  app.addHook("onClose", async () => {
    unsubscribe();
    await io.close();
  });
}

function platformWebOrigins() {
  const configuredOrigins = [env.PLATFORM_WEB_ORIGIN, ...env.PLATFORM_WEB_ORIGINS.split(",")];
  if (env.NODE_ENV !== "production") {
    configuredOrigins.push(
      `http://127.0.0.1:${env.PLATFORM_WEB_PORT}`,
      `http://localhost:${env.PLATFORM_WEB_PORT}`
    );
  }

  return Array.from(
    new Set(
      configuredOrigins
        .map((origin) => origin.trim())
        .filter(Boolean)
        .flatMap(localOriginAliases)
        .map((origin) => origin.trim().replace(/\/$/u, ""))
    )
  );
}

function neotPermission(request: { method: string; url: string }) {
  const action = request.method === "GET" || request.method === "HEAD" ? "view" : "manage";
  if (request.url.includes("/learning/")) {
    if (action === "view") return "neot.learning.view";
    if (
      /\/learning\/lessons\/[a-f0-9]{32}\/progress(?:\?|$)/u.test(request.url) ||
      /\/learning\/tests\/[a-f0-9]{32}\/attempts(?:\?|$)/u.test(request.url) ||
      /\/learning\/(?:questions|answers)(?:\?|$)/u.test(request.url)
    ) {
      return "neot.learning.participate";
    }
    return "neot.learning.manage";
  }
  if (request.url.includes("/task-manager/")) return `neot.task-manager.${action}`;
  if (request.url.includes("/messaging/")) return `neot.messaging.${action}`;
  if (request.url.includes("/planning/")) return `neot.planning.${action}`;
  if (request.url.includes("/orchestration/")) return `neot.orchestration.${action}`;
  if (request.url.includes("/sync/")) return `neot.sync.${action}`;
  if (request.url.includes("/notifications")) return `neot.notification.${action}`;
  if (request.url.includes("/project-manager/registry/")) return `neot.registry.${action}`;
  return `neot.project-manager.${action}`;
}

function localOriginAliases(origin: string) {
  const origins = [origin];
  const url = new URL(origin);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    origins.push(url.origin);
  } else if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    origins.push(url.origin);
  }
  return origins;
}
