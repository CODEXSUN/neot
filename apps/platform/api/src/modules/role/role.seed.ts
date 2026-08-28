import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

const roles = [
  {
    description: "Protected full administration access for NEOT.",
    key: "admin",
    label: "Administrator",
    protected: true
  },
  {
    description: "NEOT management access.",
    key: "manager",
    label: "Manager",
    protected: true
  },
  {
    description: "NEOT staff access.",
    key: "staff",
    label: "Staff",
    protected: true
  },
  {
    description: "Standard NEOT access.",
    key: "user",
    label: "User",
    protected: false
  },
  {
    description: "Student access to courses, lessons, assessments, and learning progress.",
    key: "student",
    label: "Student",
    protected: true
  },
  {
    description: "Master access to organise and publish NEOT learning content.",
    key: "master",
    label: "Master",
    protected: true
  },
  {
    description: "Read-only access.",
    key: "auditor",
    label: "Auditor",
    protected: false
  }
] as const;

export async function seedRoleModule(database: Kysely<PlatformDatabase>) {
  for (const role of roles) {
    await database
      .insertInto("roles")
      .values({
        description: role.description,
        is_protected: role.protected,
        key: role.key,
        label: role.label,
        status: "active",
        uuid: stable(`role:${role.key}`)
      })
      .onDuplicateKeyUpdate({
        description: role.description,
        is_protected: role.protected,
        label: role.label,
        status: "active"
      })
      .execute();
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
