import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/platform-api";
import type { Role, RoleListFilters, RoleSavePayload } from "./role.types";
const path = "/identity/roles";
export function listRoles(filters: RoleListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<Role[]>(`${path}${query.size ? `?${query}` : ""}`);
}
export function createRole(payload: RoleSavePayload) {
  return apiPost<Role>(path, toApi(payload));
}
export function updateRole(id: number, payload: RoleSavePayload) {
  return apiPut<Role>(`${path}/${id}`, toApi(payload));
}
export function activateRole(id: number) {
  return apiPost<Role>(`${path}/${id}/activate`, {});
}
export function deactivateRole(id: number) {
  return apiPost<Role>(`${path}/${id}/deactivate`, {});
}
export function forceDeleteRole(id: number) {
  return apiDelete<Role>(`${path}/${id}/force`);
}
function toApi(payload: RoleSavePayload) {
  return payload;
}
