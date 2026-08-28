import type { FastifyInstance } from "fastify";
import { createStructuredLog } from "../logger/logger.js";

const requestStartTimes = new WeakMap<object, [number, number]>();

export function registerRequestLogging(app: FastifyInstance): void {
  app.addHook("onRequest", async (request) => {
    if (isHealthRequest(request.url)) return;
    requestStartTimes.set(request.raw, process.hrtime());

    const log = createStructuredLog({
      level: "info",
      message: `Incoming request: ${request.method} ${request.url}`,
      requestId: request.id,
      action: "request"
    });
    if (request.correlationId) {
      log.correlationId = request.correlationId;
    }
    if (request.tenantId) {
      log.tenantId = request.tenantId;
    }

    writeConsoleLog(log, {
      method: request.method,
      url: request.url
    });
    request.log.info(log);
  });

  app.addHook("onResponse", async (request, reply) => {
    if (isHealthRequest(request.url)) return;
    const start = requestStartTimes.get(request.raw);
    let durationMs: number | undefined;
    if (start) {
      const diff = process.hrtime(start);
      durationMs = diff[0] * 1e3 + diff[1] / 1e6;
    }

    const log = createStructuredLog({
      level: reply.statusCode >= 500 ? "error" : reply.statusCode >= 400 ? "warn" : "info",
      message: `Request completed: ${request.method} ${request.url} - Status ${reply.statusCode}`,
      requestId: request.id,
      action: "response"
    });
    if (request.correlationId) {
      log.correlationId = request.correlationId;
    }
    if (request.tenantId) {
      log.tenantId = request.tenantId;
    }
    if (durationMs !== undefined) {
      log.durationMs = durationMs;
    }

    writeConsoleLog(log, {
      method: request.method,
      statusCode: reply.statusCode,
      url: request.url
    });
    if (reply.statusCode >= 500) {
      request.log.error(log);
    } else if (reply.statusCode >= 400) {
      request.log.warn(log);
    } else {
      request.log.info(log);
    }
  });
}

function isHealthRequest(url: string) {
  return url === "/health" || url.startsWith("/health?");
}

function writeConsoleLog(
  log: ReturnType<typeof createStructuredLog>,
  details: { method: string; statusCode?: number; url: string }
) {
  const duration = typeof log.durationMs === "number" ? ` ${Math.round(log.durationMs)}ms` : "";
  const status = typeof details.statusCode === "number" ? ` ${details.statusCode}` : "";
  const tenant = log.tenantId ? ` tenant=${log.tenantId}` : "";
  const correlation = log.correlationId ? ` correlation=${log.correlationId}` : "";
  const line = `[${log.action}] ${details.method} ${details.url}${status}${duration} request=${log.requestId}${tenant}${correlation}`;
  if (log.level === "error") {
    console.error(line);
  } else if (log.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
