import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

const permissionKeys = [
  "identity.user.view",
  "identity.user.create",
  "identity.user.update",
  "identity.user.suspend",
  "identity.user.delete",
  "identity.role.view",
  "identity.role.create",
  "identity.role.update",
  "identity.role.suspend",
  "identity.role.delete",
  "identity.permission.view",
  "identity.permission.create",
  "identity.permission.update",
  "identity.permission.suspend",
  "identity.permission.delete",
  "identity.user-role.view",
  "identity.user-role.assign",
  "identity.user-role.update",
  "identity.user-role.remove",
  "identity.role-permission.view",
  "identity.role-permission.assign",
  "identity.role-permission.update",
  "identity.role-permission.remove",
  "neot.project-manager.view",
  "neot.project-manager.manage",
  "neot.task-manager.view",
  "neot.task-manager.manage",
  "neot.messaging.view",
  "neot.messaging.manage",
  "neot.planning.view",
  "neot.planning.manage",
  "neot.registry.view",
  "neot.registry.manage",
  "neot.orchestration.view",
  "neot.orchestration.manage",
  "neot.sync.view",
  "neot.sync.manage",
  "neot.notification.view",
  "neot.notification.manage",
  "neot.learning.view",
  "neot.learning.participate",
  "neot.learning.manage",
  "blog.manage"
] as const;

export async function seedPermissionModule(database: Kysely<PlatformDatabase>) {
  for (const key of permissionKeys) {
    const label = key
      .split(".")
      .map((part) => part.replaceAll("-", " "))
      .join(" - ");
    await database
      .insertInto("permissions")
      .values({
        description: `Allows ${label.toLowerCase()} in NEOT.`,
        is_protected: true,
        key,
        label,
        status: "active",
        uuid: stable(key)
      })
      .onDuplicateKeyUpdate({
        description: `Allows ${label.toLowerCase()} in NEOT.`,
        is_protected: true,
        label,
        status: "active"
      })
      .execute();
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
