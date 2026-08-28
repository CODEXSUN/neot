import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { isAppError } from "../errors/index.js";
import { fail, ok } from "../http/index.js";
import { registerShutdownHooks, type ShutdownHook } from "./graceful-shutdown.js";
import { registerTenantContext } from "./tenant-context.js";

export type CreateApiAppOptions = {
  appName: string;
  cookieSecret: string;
  corsOrigins: string[];
  environment: string;
  onReady?: () => Promise<void> | void;
  registerRootRoute?: boolean;
  shutdownHooks?: ShutdownHook[];
  tenantContext?: boolean;
};

function requestMeta(request: { correlationId?: string; id: string; tenantId?: string }) {
  return {
    requestId: request.id,
    ...(request.correlationId ? { correlationId: request.correlationId } : {}),
    ...(request.tenantId ? { tenantId: request.tenantId } : {})
  };
}

export async function createApiApp(options: CreateApiAppOptions): Promise<FastifyInstance> {
  console.info(`[app.boot] creating ${options.appName} (${options.environment})`);
  const app = Fastify({
    logger: options.environment === "development" ? false : { level: "warn" }
  });

  if (process.env.API_ROUTE_LOGGING === "1") {
    app.addHook("onRoute", (route) => {
      const methods = Array.isArray(route.method) ? route.method.join(",") : route.method;
      console.info(`[route.registered] ${methods} ${route.url}`);
    });
  }

  await app.register(cors, {
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    origin: options.corsOrigins
  });
  console.info(`[plugin.ready] cors origins=${options.corsOrigins.join(",") || "none"}`);

  await app.register(cookie, {
    secret: options.cookieSecret
  });
  console.info("[plugin.ready] cookie");

  if (options.tenantContext !== false) {
    registerTenantContext(app);
    console.info("[context.ready] tenant");
  } else {
    console.info("[context.ready] single-client");
  }

  app.setErrorHandler((error, request, reply) => {
    console.error(
      `[request.error] ${request.method} ${request.url} request=${request.id} ${errorMessage(error)}`
    );
    if (isAppError(error)) {
      return reply.code(error.statusCode).send(
        fail(
          {
            code: error.code,
            details: error.details,
            message: error.message
          },
          requestMeta(request)
        )
      );
    }

    request.log.error(error);

    return reply.code(500).send(
      fail(
        {
          code: "INTERNAL_ERROR",
          message: "Something went wrong"
        },
        requestMeta(request)
      )
    );
  });

  if (options.onReady) {
    app.addHook("onReady", options.onReady);
  }

  app.addHook("onReady", () => {
    console.info(`[app.ready] ${options.appName}`);
  });

  app.addHook("onClose", async () => {
    console.info(`[app.close] ${options.appName}`);
  });

  if (options.shutdownHooks?.length) {
    registerShutdownHooks(app, options.shutdownHooks);
  }

  if (options.registerRootRoute !== false) {
    app.get("/", async (request) =>
      ok(
        {
          name: options.appName,
          status: "ready"
        },
        requestMeta(request)
      )
    );
  }

  return app;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
