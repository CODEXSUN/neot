import type { FastifyRequest } from "fastify";
import { AppError } from "@neot/framework/errors";
import { getPlatformDatabase } from "../database/platform-database.js";
import { verifyAuthToken } from "./jwt.js";

export function identityContext(request: FastifyRequest) {
  const token = request.headers.authorization?.startsWith("Bearer ")
    ? request.headers.authorization.slice("Bearer ".length).trim()
    : "";
  const claims = token ? verifyAuthToken(token) : null;
  if (!claims) throw AppError.unauthorized("Session expired. Please sign in again.");

  const database = getPlatformDatabase();
  const actorUser = () =>
    database
      .selectFrom("users")
      .select(["id", "uuid", "email", "name", "role", "status"])
      .where("uuid", "=", claims.userId)
      .where("status", "=", "active")
      .executeTakeFirst();

  const can = async (permission: string) => {
    const user = await actorUser();
    if (!user) return false;
    if (isAdministratorPermission(permission) && user.role !== "admin") return false;
    const allowed = await database
      .selectFrom("user_roles as userRole")
      .innerJoin("roles as role", "role.id", "userRole.role_id")
      .innerJoin("role_permissions as rolePermission", "rolePermission.role_id", "role.id")
      .innerJoin("permissions as permission", "permission.id", "rolePermission.permission_id")
      .select("permission.id")
      .where("userRole.user_id", "=", user.id)
      .where("userRole.status", "=", "active")
      .where("role.status", "=", "active")
      .where("rolePermission.status", "=", "active")
      .where("permission.status", "=", "active")
      .where("permission.key", "=", permission)
      .executeTakeFirst();
    return Boolean(allowed);
  };

  return {
    actorEmail: claims.email,
    actorUser,
    authorize: async (permission: string) => {
      if (!(await can(permission))) {
        throw AppError.forbidden(`Permission ${permission} is required.`);
      }
    },
    can,
    database,
    scopeId: "neot"
  };
}

function isAdministratorPermission(permission: string) {
  return permission.startsWith("identity.");
}
