import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export type UserRoleStatus = "active" | "inactive";
export type UserRole = {
  id: number;
  isProtected: boolean;
  roleId: number;
  roleKey: string;
  roleLabel: string;
  status: UserRoleStatus;
  userEmail: string;
  userId: number;
  userName: string;
  uuid: string;
};
export type UserRoleSavePayload = {
  roleId: number;
  status: UserRoleStatus;
  userId: number;
};
export type UserRoleListFilters = { search?: string };
export type UserRoleContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<PlatformDatabase>;
};
