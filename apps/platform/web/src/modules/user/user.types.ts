export type UserStatus = "active" | "inactive" | "suspended";
export type User = {
  id: number;
  isProtected: boolean;
  email: string;
  name: string;
  password?: string;
  role: string;
  status: UserStatus;
  uuid: string;
};
export type UserSavePayload = {
  email: string;
  name: string;
  password?: string;
  roleId?: number;
  status: UserStatus;
};
export type UserAccessSelection = {
  roleId: number | null;
};
export type UserAccessOption = {
  description?: string;
  id: number;
  key: string;
  label: string;
};
export type UserListFilters = { search?: string };
export type UserProfile = {
  email: string;
  id: number;
  name: string;
  uuid: string;
};
export type UserProfileSavePayload = { email: string; name: string; password?: string | undefined };
export type UserProfileFormValue = UserProfileSavePayload & { confirmPassword: string };
