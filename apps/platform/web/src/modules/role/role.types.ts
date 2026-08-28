export type RoleStatus = "active" | "inactive";
export type Role = {
  id: number;
  isProtected: boolean;
  description: string;
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
