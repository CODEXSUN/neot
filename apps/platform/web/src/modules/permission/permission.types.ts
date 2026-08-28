export type PermissionStatus = "active" | "inactive";
export type Permission = {
  id: number;
  isProtected: boolean;
  description: string;
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
