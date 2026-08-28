import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  UserRole,
  UserRoleListFilters,
  UserRoleRoleLookup,
  UserRoleSavePayload,
  UserRoleUserLookup
} from "./user-role.types";
const path = "/identity/user-roles";
export function listUserRoles(filters: UserRoleListFilters = {}) {
  const q = new URLSearchParams();
  if (filters.search?.trim()) q.set("search", filters.search.trim());
  return apiGet<UserRole[]>(`${path}${q.size ? `?${q}` : ""}`);
}
export function listUserOptions() {
  return apiGet<UserRoleUserLookup[]>("/identity/users");
}
export function listRoleOptions() {
  return apiGet<UserRoleRoleLookup[]>("/identity/roles");
}
export function createUserRole(payload: UserRoleSavePayload) {
  return apiPost<UserRole>(path, toApi(payload));
}
export function updateUserRole(id: number, payload: UserRoleSavePayload) {
  return apiPut<UserRole>(`${path}/${id}`, toApi(payload));
}
export function activateUserRole(id: number) {
  return apiPost<UserRole>(`${path}/${id}/activate`, {});
}
export function deactivateUserRole(id: number) {
  return apiPost<UserRole>(`${path}/${id}/deactivate`, {});
}
export function forceDeleteUserRole(id: number) {
  return apiDelete<UserRole>(`${path}/${id}/force`);
}
function toApi(payload: UserRoleSavePayload) {
  return payload;
}
