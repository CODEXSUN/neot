export type RolePermissionStatus = "active" | "inactive";
export type RolePermission = {
  id: number;
  isProtected: boolean;
  roleId: number;
  roleLabel: string;
  roleKey: string;
  permissionId: number;
  permissionLabel: string;
  permissionKey: string;
  status: RolePermissionStatus;
  uuid: string;
};
export type RolePermissionSavePayload = {
  permissionId: number;
  roleId: number;
  status: RolePermissionStatus;
};
export type RolePermissionListFilters = { search?: string };
export type RolePermissionRoleLookup = {
  id: number;
  key: string;
  label: string;
  status: string;
};
export type RolePermissionPermissionLookup = {
  id: number;
  key: string;
  label: string;
  status: string;
};
