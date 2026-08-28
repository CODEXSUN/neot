import { apiGet, apiPost } from "../../shared/api/neot-api";
import type { TelegramConnectionStart, TelegramMessage, TelegramStatus } from "./telegram-support.types";
export const telegramStatus = () => apiGet<TelegramStatus>("/telegram/status");
export const beginTelegramConnection = () => apiPost<TelegramConnectionStart>("/telegram/connect");
export const submitTelegramPassword = (password: string) => apiPost<{ accepted: boolean }>("/telegram/connect/password", { password });
export const disconnectTelegram = () => apiPost<{ disconnected: boolean }>("/telegram/disconnect");
export const telegramMessages = () => apiGet<TelegramMessage[]>("/telegram/messages");
export const sendTelegramMessage = (body: string) => apiPost<{ sent: boolean }>("/telegram/messages", { body });
