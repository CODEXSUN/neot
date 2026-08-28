import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { Permission, PermissionListFilters, PermissionSavePayload } from "./permission.types";
const path = "/identity/permissions";
export function listPermissions(filters: PermissionListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<Permission[]>(`${path}${query.size ? `?${query}` : ""}`);
}
export function createPermission(payload: PermissionSavePayload) {
  return apiPost<Permission>(path, toApi(payload));
}
export function updatePermission(id: number, payload: PermissionSavePayload) {
  return apiPut<Permission>(`${path}/${id}`, toApi(payload));
}
export function activatePermission(id: number) {
  return apiPost<Permission>(`${path}/${id}/activate`, {});
}
export function deactivatePermission(id: number) {
  return apiPost<Permission>(`${path}/${id}/deactivate`, {});
}
export function forceDeletePermission(id: number) {
  return apiDelete<Permission>(`${path}/${id}/force`);
}
function toApi(payload: PermissionSavePayload) {
  return payload;
}
