export type UserRoleStatus = "active" | "inactive";
export type UserRole = {
  id: number;
  isProtected: boolean;
  userId: number;
  userName: string;
  userEmail: string;
  roleId: number;
  roleLabel: string;
  roleKey: string;
  status: UserRoleStatus;
  uuid: string;
};
export type UserRoleSavePayload = {
  roleId: number;
  status: UserRoleStatus;
  userId: number;
};
export type UserRoleListFilters = { search?: string };
export type UserRoleUserLookup = {
  id: number;
  email: string;
  isProtected: boolean;
  name: string;
  status: string;
};
export type UserRoleRoleLookup = {
  id: number;
  key: string;
  label: string;
  status: string;
};
