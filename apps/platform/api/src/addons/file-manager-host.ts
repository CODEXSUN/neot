import { resolve } from "node:path";
import type { FastifyRequest } from "fastify";
import { identityContext } from "../auth/identity-context.js";
import { env } from "../env.js";

configureFileManagerEnvironment();

const fileManagerApi = await import("@codexsun/file-manager/api");

export const closeFileManagerDatabase = fileManagerApi.closeFileManagerDatabase;
export const fileManagerApiModuleKeys = fileManagerApi.fileManagerApiModuleKeys;
export const registerFileManagerApi = fileManagerApi.registerFileManagerApi;

export async function resolveFileManagerContext(request: FastifyRequest) {
  if (isPublicFileContentRequest(request)) {
    return { actorId: "public:file-content", host: "neot", tenantId: env.DB_NAME };
  }

  const actor = await identityContext(request).actorUser();
  if (!actor) throw new Error("File Manager authentication is required.");
  return { actorId: actor.uuid, host: "neot", tenantId: env.DB_NAME };
}

function isPublicFileContentRequest(request: FastifyRequest) {
  return (
    request.method === "GET" &&
    request.routeOptions.url?.endsWith("/file-manager/files/:uuid/content") === true
  );
}

function configureFileManagerEnvironment() {
  setDefault("FILE_MANAGER_DB_HOST", env.DB_HOST);
  setDefault("FILE_MANAGER_DB_NAME", env.DB_NAME);
  setDefault("FILE_MANAGER_DB_PASSWORD", env.DB_PASSWORD);
  setDefault("FILE_MANAGER_DB_PORT", String(env.DB_PORT));
  setDefault("FILE_MANAGER_DB_USER", env.DB_USER);
  setDefault("FILE_MANAGER_ENCRYPTION_KEY", env.JWT_SECRET);
  process.env.FILE_MANAGER_LOCAL_ROOT = resolve(
    process.cwd(),
    process.env.FILE_MANAGER_LOCAL_ROOT?.trim() || "storage"
  );
  setDefault("FILE_MANAGER_MAX_UPLOAD_BYTES", String(25 * 1024 * 1024));
}

function setDefault(key: string, value: string) {
  if (!process.env[key]?.trim()) process.env[key] = value;
}
