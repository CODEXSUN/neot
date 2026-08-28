import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { getPlatformDatabase } from "../database/platform-database.js";
import { signAuthToken } from "./jwt.js";
import { hashPassword, verifyPassword } from "./password-hash.js";

export class AuthService {
  async register(input: {
    email: string;
    name: string;
    password: string;
    role: "master" | "student";
  }) {
    const database = getPlatformDatabase();
    const email = input.email.trim().toLowerCase();
    try {
      await database.transaction().execute(async (transaction) => {
        const role = await transaction
          .selectFrom("roles")
          .select("id")
          .where("key", "=", input.role)
          .where("status", "=", "active")
          .executeTakeFirst();
        if (!role) throw AppError.validation("The selected learning role is unavailable.");
        const result = await transaction
          .insertInto("users")
          .values({
            email,
            is_protected: false,
            name: input.name.trim(),
            password_hash: hashPassword(input.password),
            role: input.role,
            status: "active",
            uuid: randomBytes(4).toString("hex")
          })
          .executeTakeFirstOrThrow();
        const userId = Number(result.insertId);
        await transaction
          .insertInto("user_roles")
          .values({
            is_protected: false,
            role_id: role.id,
            status: "active",
            user_id: userId,
            uuid: randomBytes(4).toString("hex")
          })
          .execute();
      });
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("An account already uses this email.");
      throw error;
    }
    return this.login({ email, password: input.password });
  }

  async login(input: { email?: string; password?: string }) {
    const email = input.email?.trim().toLowerCase() ?? "";
    const password = input.password ?? "";
    if (!email || !password) return null;

    const database = getPlatformDatabase();
    const user = await database
      .selectFrom("users")
      .select(["id", "uuid", "email", "name", "password_hash", "role", "status"])
      .where("email", "=", email)
      .executeTakeFirst();
    if (!user || user.status !== "active" || !verifyPassword(password, user.password_hash)) {
      return null;
    }

    const permissions = await database
      .selectFrom("user_roles as userRole")
      .innerJoin("roles as role", "role.id", "userRole.role_id")
      .innerJoin("role_permissions as rolePermission", "rolePermission.role_id", "role.id")
      .innerJoin("permissions as permission", "permission.id", "rolePermission.permission_id")
      .select("permission.key")
      .where("userRole.user_id", "=", user.id)
      .where("userRole.status", "=", "active")
      .where("role.status", "=", "active")
      .where("rolePermission.status", "=", "active")
      .where("permission.status", "=", "active")
      .distinct()
      .orderBy("permission.key")
      .execute();
    const permissionKeys = permissions.map(({ key }) => key);
    const accessToken = signAuthToken({
      email: user.email,
      name: user.name,
      permissions: permissionKeys,
      role: user.role,
      userId: user.uuid
    });

    return {
      accessToken,
      email: user.email,
      name: user.name,
      permissions: permissionKeys,
      role: user.role
    };
  }
}

function isDuplicate(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
