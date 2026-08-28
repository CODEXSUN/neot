import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export const ADMIN_ROLE_KEY = "admin" as const;
export type RoleStatus = "active" | "inactive";
export type Role = {
  description: string;
  id: number;
  isProtected: boolean;
  key: string;
  label: string;
  status: RoleStatus;
  uuid: string;
};
export type RoleSavePayload = {
  description: string;
  key: string;
  label: string;
  status: RoleStatus;
};
export type RoleListFilters = { search?: string };
export type RoleContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<PlatformDatabase>;
};
