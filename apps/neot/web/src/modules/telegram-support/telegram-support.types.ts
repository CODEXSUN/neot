export type TelegramStatus = {
  configured: boolean;
  connected: boolean;
  displayName: string;
  error: string;
  expiresAt: string;
  passwordHint: string;
  qrUrl: string;
  status: "idle" | "waiting-for-scan" | "waiting-for-password" | "connected" | "error";
  telegramUsername: string;
};
export type TelegramMessage = { body: string; createdAt: string; direction: "inbound" | "outbound"; id: string };
export type TelegramConnectionStart = { started: boolean };
