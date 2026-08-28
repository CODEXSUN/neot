import type { Kysely } from "kysely";
import type { PlatformDatabase } from "../../database/schema.js";

export type UserStatus = "active" | "inactive" | "suspended";
export type User = {
  email: string;
  id: number;
  isProtected: boolean;
  name: string;
  role: string;
  status: UserStatus;
  uuid: string;
};
export type UserSavePayload = {
  email: string;
  name: string;
  password?: string | undefined;
  roleId?: number | undefined;
  status: UserStatus;
};
export type UserProfile = Pick<User, "email" | "id" | "name" | "uuid">;
export type UserProfileSavePayload = { email: string; name: string; password?: string | undefined };
export type UserListFilters = { search?: string };
export type UserReference = Pick<User, "email" | "id" | "name" | "uuid">;
export type UserContext = {
  actorEmail: string;
  authorize: (permission: string) => Promise<void>;
  database: Kysely<PlatformDatabase>;
};
