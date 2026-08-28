import type { FastifyInstance, FastifyRequest } from "fastify";
import { sql, type Kysely } from "kysely";
import {
  provisionBlogsDatabase,
  registerBlogsApi,
  type BlogMigrationBatch,
  type BlogRequestContext,
  type BlogsDatabase
} from "@codexsun/blog/api";
import { identityContext } from "../auth/identity-context.js";
import { verifyAuthToken } from "../auth/jwt.js";
import { getPlatformDatabase } from "../database/platform-database.js";
import { env } from "../env.js";
import {
  registerFileManagerApi,
  resolveFileManagerContext
} from "./file-manager-host.js";

export async function registerNEOTAddons(app: FastifyInstance) {
  await provisionBlogsDatabase({
    context: blogContext(null, env.PLATFORM_WEB_ORIGIN),
    runMigrationBatch: runBlogMigrationBatch
  });
  await app.register(
    async (blogsApp) => {
      blogsApp.addHook("onRequest", (request, _reply, done) => {
        if (request.raw.url?.startsWith("/api/platform/public/")) {
          request.raw.url = request.raw.url.slice("/api/platform".length);
        }
        done();
      });
      await registerBlogsApi(blogsApp, {
        authorize: ({ request }) => identityContext(request).authorize("blog.manage"),
        resolveContext: resolveBlogContext
      });
    },
    { prefix: "/api/platform" }
  );
  await app.register(
    async (fileManagerApp) =>
      registerFileManagerApi(fileManagerApp, { resolveContext: resolveFileManagerContext }),
    { prefix: "/api/platform" }
  );
}

async function resolveBlogContext(request: FastifyRequest) {
  const authorization = request.headers.authorization ?? "";
  const actor = verifyAuthToken(authorization.replace(/^Bearer\s+/iu, ""));
  const authority = request.headers.host ?? "localhost";
  return blogContext(actor?.userId ?? null, request.headers.origin ?? `${request.protocol}://${authority}`);
}

function blogContext(actorId: string | null, origin: string): BlogRequestContext {
  return {
    actorId,
    database: getPlatformDatabase() as unknown as Kysely<BlogsDatabase>,
    host: "neot",
    origin,
    scopeId: env.DB_NAME
  };
}

async function runBlogMigrationBatch(
  database: Kysely<BlogsDatabase>,
  batch: BlogMigrationBatch
) {
  for (const step of batch.steps) {
    const migrationName = `${batch.scope}:${step.name}:v${step.version}`;
    const applied = await sql<{ name: string }>`
      SELECT name FROM schema_migrations WHERE name = ${migrationName} LIMIT 1
    `.execute(database);
    if (applied.rows.length > 0) continue;
    await step.up(database);
    await sql`INSERT INTO schema_migrations (name) VALUES (${migrationName})`.execute(database);
  }
}
