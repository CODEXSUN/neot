import type { ColumnType, Generated } from "kysely";
import type { NEOTDatabase } from "@neot/neot-api";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type UsersTable = {
  created_at: TimestampColumn;
  email: string;
  id: Generated<number>;
  is_protected: boolean | number;
  name: string;
  password_hash: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  updated_at: TimestampColumn;
  uuid: string;
};

export type RolesTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  is_protected: boolean | number;
  key: string;
  label: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type PermissionsTable = {
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  is_protected: boolean | number;
  key: string;
  label: string;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type UserRolesTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  is_protected: boolean | number;
  role_id: number;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  user_id: number;
  uuid: string;
};

export type RolePermissionsTable = {
  created_at: TimestampColumn;
  id: Generated<number>;
  is_protected: boolean | number;
  permission_id: number;
  role_id: number;
  status: "active" | "inactive";
  updated_at: TimestampColumn;
  uuid: string;
};

export type SchemaMigrationsTable = {
  applied_at: TimestampColumn;
  id: Generated<number>;
  name: string;
  package_id: ColumnType<string, string | undefined, string | undefined>;
};

export type PlatformIdentityDatabase = {
  permissions: PermissionsTable;
  role_permissions: RolePermissionsTable;
  roles: RolesTable;
  schema_migrations: SchemaMigrationsTable;
  user_roles: UserRolesTable;
  users: UsersTable;
};

export type PlatformDatabase = Omit<NEOTDatabase, "schema_migrations"> &
  PlatformIdentityDatabase;
