import { AppError } from "@neot/framework/errors";
import { Api, TelegramClient } from "teleproto";
import { StringSession } from "teleproto/sessions/StringSession.js";
import { decryptTelegramSession, encryptTelegramSession } from "./telegram-session.crypto.js";
import { TelegramSupportRepository } from "./telegram-support.repository.js";

type LoginState = {
  error: string;
  expiresAt: string;
  passwordHint: string;
  qrUrl: string;
  status: "idle" | "waiting-for-scan" | "waiting-for-password" | "connected" | "error";
};

export class TelegramMtprotoService {
  private client: TelegramClient | undefined;
  private loginAbort: AbortController | undefined;
  private passwordResolve: ((password: string) => void) | undefined;
  private state: LoginState = emptyState();

  constructor(private readonly repository = new TelegramSupportRepository()) {}

  async status() {
    const connection = await this.repository.mtprotoConnection();
    const configured = Boolean(credentials(false));
    return {
      configured,
      connected: connection?.status === "connected" && Boolean(connection.encrypted_session),
      displayName: connection?.display_name ?? "",
      error: this.state.error,
      expiresAt: this.state.expiresAt,
      passwordHint: this.state.passwordHint,
      qrUrl: this.state.qrUrl,
      status: connection?.status === "connected" ? "connected" : this.state.status,
      telegramUsername: connection?.telegram_username ?? ""
    };
  }

  async beginConnection() {
    const auth = credentials(true)!;
    this.loginAbort?.abort();
    await this.client?.disconnect();
    this.state = emptyState();
    this.loginAbort = new AbortController();
    const client = new TelegramClient(new StringSession(""), auth.apiId, auth.apiHash, { connectionRetries: 5 });
    this.client = client;
    await client.connect();
    void this.authorize(client, auth, this.loginAbort.signal);
    return { started: true };
  }

  async submitPassword(passwordInput: string) {
    const password = passwordInput.trim();
    if (!password || !this.passwordResolve) throw AppError.validation("Telegram is not waiting for a two-step verification password.");
    this.passwordResolve(password);
    this.passwordResolve = undefined;
    return { accepted: true };
  }

  async disconnect() {
    this.loginAbort?.abort();
    const client = await this.authorizedClient(false);
    if (client) {
      try { await client.invoke(new Api.auth.LogOut()); } catch { await client.disconnect(); }
    }
    this.client = undefined;
    this.state = emptyState();
    await this.repository.disconnectMtproto();
    return { disconnected: true };
  }

  async messages() {
    const client = await this.authorizedClient(true);
    const messages = await client!.getMessages("me", { limit: 200 });
    return [...messages].reverse().filter((message) => Boolean(message.message)).map((message) => ({
      body: message.message,
      createdAt: new Date(message.date * 1000).toISOString(),
      direction: "outbound" as const,
      id: String(message.id)
    }));
  }

  async send(bodyInput: string) {
    const body = bodyInput.trim();
    if (!body) throw AppError.validation("Message is required.");
    const client = await this.authorizedClient(true);
    await client!.sendMessage("me", { message: body });
    return { sent: true };
  }

  async sendNotification(body: string) {
    const client = await this.authorizedClient(false);
    if (!client) return false;
    await client.sendMessage("me", { message: body });
    return true;
  }

  private async authorize(client: TelegramClient, auth: { apiId: number; apiHash: string }, abortSignal: AbortSignal) {
    try {
      const user = await client.signInUserWithQrCode(auth, {
        abortSignal,
        onError: async (error) => { this.state = { ...this.state, error: error.message, status: "error" }; return true; },
        password: async (hint) => {
          this.state = { ...this.state, passwordHint: hint ?? "", qrUrl: "", status: "waiting-for-password" };
          return new Promise<string>((resolve) => { this.passwordResolve = resolve; });
        },
        qrCode: async ({ expires, token }) => {
          this.state = {
            ...this.state,
            expiresAt: new Date(expires * 1000).toISOString(),
            qrUrl: `tg://login?token=${token.toString("base64url")}`,
            status: "waiting-for-scan"
          };
        }
      });
      const session = String(client.session.save());
      await this.repository.saveMtprotoConnection({
        displayName: ["firstName" in user ? user.firstName : "", "lastName" in user ? user.lastName : ""].filter(Boolean).join(" "),
        encryptedSession: encryptTelegramSession(session),
        id: String(user.id),
        username: "username" in user ? user.username ?? "" : ""
      });
      this.state = { ...emptyState(), status: "connected" };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      this.state = { ...this.state, error: error instanceof Error ? error.message : "Telegram authorization failed.", status: "error" };
    }
  }

  private async authorizedClient(required: boolean) {
    if (this.client && await this.client.checkAuthorization()) return this.client;
    const connection = await this.repository.mtprotoConnection();
    if (!connection?.encrypted_session || connection.status !== "connected") {
      if (required) throw AppError.validation("Connect Telegram first.");
      return undefined;
    }
    const auth = credentials(true)!;
    const client = new TelegramClient(new StringSession(decryptTelegramSession(connection.encrypted_session)), auth.apiId, auth.apiHash, { connectionRetries: 5 });
    await client.connect();
    if (!await client.checkAuthorization()) {
      await this.repository.disconnectMtproto();
      if (required) throw AppError.validation("The Telegram session expired. Connect Telegram again.");
      return undefined;
    }
    this.client = client;
    return client;
  }
}

function credentials(required: boolean) {
  const apiId = Number(process.env.TELEGRAM_API_ID?.trim());
  const apiHash = process.env.TELEGRAM_API_HASH?.trim() ?? "";
  if (Number.isInteger(apiId) && apiId > 0 && apiHash) return { apiHash, apiId };
  if (required) throw AppError.validation("TELEGRAM_API_ID and TELEGRAM_API_HASH are required.");
  return undefined;
}

function emptyState(): LoginState {
  return { error: "", expiresAt: "", passwordHint: "", qrUrl: "", status: "idle" };
}

export const telegramMtprotoService = new TelegramMtprotoService();
