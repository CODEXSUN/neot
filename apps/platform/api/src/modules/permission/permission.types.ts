import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";
export type PermissionStatus = "active" | "inactive";
export type Permission = {
  description: string;
  id: number;
  isProtected: boolean;
  key: string;
  label: string;
  status: PermissionStatus;
  uuid: string;
};
export type PermissionSavePayload = {
  description: string;
  key: string;
  label: string;
  status: PermissionStatus;
};
export type PermissionListFilters = { search?: string };
export type PermissionContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<PlatformDatabase>;
};
