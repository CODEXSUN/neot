import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import { hashPassword } from "../../auth/password-hash.js";
import type { PlatformDatabase } from "../../database/schema.js";
import { env } from "../../env.js";

export async function seedUserModule(database: Kysely<PlatformDatabase>) {
  const email = env.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
  const password = env.INITIAL_ADMIN_PASSWORD.trim();
  if (!email || !password) return;
  const name = env.INITIAL_ADMIN_NAME.trim() || email;
  await database
    .insertInto("users")
    .values({
      email,
      is_protected: true,
      name,
      password_hash: hashPassword(password),
      role: "admin",
      status: "active",
      uuid: stable(email)
    })
    .onDuplicateKeyUpdate({
      is_protected: true,
      name,
      role: "admin",
      status: "active"
    })
    .execute();
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
