import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type {
  RolePermission,
  RolePermissionListFilters,
  RolePermissionPermissionLookup,
  RolePermissionRoleLookup,
  RolePermissionSavePayload
} from "./role-permission.types";
const path = "/identity/role-permissions";
export function listRolePermissions(filters: RolePermissionListFilters = {}) {
  const q = new URLSearchParams();
  if (filters.search?.trim()) q.set("search", filters.search.trim());
  return apiGet<RolePermission[]>(`${path}${q.size ? `?${q}` : ""}`);
}
export function listRoleOptions() {
  return apiGet<RolePermissionRoleLookup[]>("/identity/roles");
}
export function listPermissionOptions() {
  return apiGet<RolePermissionPermissionLookup[]>("/identity/permissions");
}
export function createRolePermission(payload: RolePermissionSavePayload) {
  return apiPost<RolePermission>(path, toApi(payload));
}
export function updateRolePermission(id: number, payload: RolePermissionSavePayload) {
  return apiPut<RolePermission>(`${path}/${id}`, toApi(payload));
}
export function activateRolePermission(id: number) {
  return apiPost<RolePermission>(`${path}/${id}/activate`, {});
}
export function deactivateRolePermission(id: number) {
  return apiPost<RolePermission>(`${path}/${id}/deactivate`, {});
}
export function forceDeleteRolePermission(id: number) {
  return apiDelete<RolePermission>(`${path}/${id}/force`);
}
function toApi(payload: RolePermissionSavePayload) {
  return payload;
}
