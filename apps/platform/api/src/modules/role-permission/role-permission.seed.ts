import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export async function seedRolePermissionModule(database: Kysely<PlatformDatabase>) {
  await sql`DELETE rp FROM role_permissions rp
    INNER JOIN roles r ON r.id=rp.role_id
    WHERE r.\`key\` IN ('super-admin','super_admin','superadmin')`.execute(database);
  await sql`DELETE FROM roles
    WHERE \`key\` IN ('super-admin','super_admin','superadmin')
      AND NOT EXISTS (SELECT 1 FROM user_roles WHERE role_id=roles.id)
      AND NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id=roles.id)`.execute(database);

  const admin = await database
    .selectFrom("roles")
    .select("id")
    .where("key", "=", "admin")
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!admin) return;
  const permissions = await database.selectFrom("permissions").select("id").execute();
  for (const permission of permissions) {
    await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
      VALUES (${stable(`role-permission:${admin.id}:${permission.id}`)},${admin.id},${permission.id},'active',TRUE)
      ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
  }

  const neotDefaults: Record<string, string[]> = {
    student: ["neot.learning.view", "neot.learning.participate"],
    master: ["neot.learning.view", "neot.learning.participate", "neot.learning.manage"],
    auditor: [
      "neot.project-manager.view",
      "neot.task-manager.view",
      "neot.messaging.view",
      "neot.planning.view",
      "neot.registry.view",
      "neot.orchestration.view",
      "neot.sync.view",
      "neot.notification.view",
      "blog.manage"
    ],
    manager: neotPermissions(),
    staff: neotPermissions().filter((key) => key !== "neot.sync.manage"),
    user: [
      "neot.project-manager.view",
      "neot.task-manager.view",
      "neot.task-manager.manage",
      "neot.messaging.view",
      "neot.messaging.manage",
      "neot.planning.view",
      "neot.planning.manage",
      "neot.registry.view",
      "neot.orchestration.view",
      "neot.notification.view",
      "blog.manage"
    ]
  };
  for (const [roleKey, permissionKeys] of Object.entries(neotDefaults)) {
    const role = await database
      .selectFrom("roles")
      .select("id")
      .where("key", "=", roleKey)
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!role) continue;
    const rolePermissions = await database
      .selectFrom("permissions")
      .select("id")
      .where("key", "in", permissionKeys)
      .execute();
    for (const permission of rolePermissions) {
      await sql`INSERT INTO role_permissions (uuid,role_id,permission_id,status,is_protected)
        VALUES (${stable(`role-permission:${role.id}:${permission.id}`)},${role.id},${permission.id},'active',TRUE)
        ON DUPLICATE KEY UPDATE status='active',is_protected=TRUE`.execute(database);
    }
  }
}

function neotPermissions() {
  return [
    ...[
      "project-manager",
      "task-manager",
      "messaging",
      "planning",
      "registry",
      "orchestration",
      "sync",
      "notification"
    ].flatMap((module) => ["view", "manage"].map((action) => `neot.${module}.${action}`)),
    "blog.manage"
  ];
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
