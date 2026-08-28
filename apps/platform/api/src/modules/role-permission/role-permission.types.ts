import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export type RolePermissionStatus = "active" | "inactive";
export type RolePermission = {
  id: number;
  isProtected: boolean;
  permissionId: number;
  permissionKey: string;
  permissionLabel: string;
  roleId: number;
  roleKey: string;
  roleLabel: string;
  status: RolePermissionStatus;
  uuid: string;
};
export type RolePermissionSavePayload = {
  permissionId: number;
  roleId: number;
  status: RolePermissionStatus;
};
export type RolePermissionListFilters = { search?: string };
export type RolePermissionContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<PlatformDatabase>;
};
