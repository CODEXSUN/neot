import { apiDelete, apiGet, apiPost, apiPut, setToken } from "../../shared/api/platform-api";
import type {
  User,
  UserListFilters,
  UserSavePayload,
  UserProfile,
  UserProfileSavePayload
} from "./user.types";
const path = "/identity/users";
export async function getUserProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>("/identity/profile");
}
export async function updateUserProfile(payload: UserProfileSavePayload) {
  const response = await apiPut<{ accessToken: string; profile: UserProfile }>(
    "/identity/profile",
    payload
  );
  setToken(response.accessToken);
  return response.profile;
}
export function listUsers(filters: UserListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  return apiGet<User[]>(`${path}${query.size ? `?${query}` : ""}`);
}
export function createUser(payload: UserSavePayload) {
  return apiPost<User>(path, toApi(payload));
}
export function updateUser(id: number, payload: UserSavePayload) {
  return apiPut<User>(`${path}/${id}`, toApi(payload));
}
export function activateUser(id: number) {
  return apiPost<User>(`${path}/${id}/activate`, {});
}
export function deactivateUser(id: number) {
  return apiPost<User>(`${path}/${id}/deactivate`, {});
}
export function suspendUser(id: number) {
  return apiPost<User>(`${path}/${id}/suspend`, {});
}
export function forceDeleteUser(id: number) {
  return apiDelete<User>(`${path}/${id}/force`);
}
function toApi(payload: UserSavePayload) {
  const { password, ...value } = payload;
  return {
    ...value,
    ...(password ? { password } : {})
  };
}
