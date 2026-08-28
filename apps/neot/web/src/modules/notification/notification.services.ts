import { apiGet, apiPut } from "../../shared/api/neot-api";
import type { NEOTNotification } from "./notification.types";

export const listNotifications = () => apiGet<NEOTNotification[]>("/notifications");
export const markNotificationRead = (id: string) =>
  apiPut<NEOTNotification>(`/notifications/${id}/read`);
