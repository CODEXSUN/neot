import { timingSafeEqual } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { TelegramSupportRepository } from "./telegram-support.repository.js";
import { telegramMtprotoService } from "./telegram-mtproto.service.js";

export class TelegramSupportService {
  constructor(private readonly repository = new TelegramSupportRepository()) {}

  async status() {
    return telegramMtprotoService.status();
  }

  async beginConnection() {
    return telegramMtprotoService.beginConnection();
  }

  async submitPassword(password: string) { return telegramMtprotoService.submitPassword(password); }

  async disconnect() { return telegramMtprotoService.disconnect(); }

  async messages() {
    return telegramMtprotoService.messages();
  }

  async send(bodyInput: string) {
    return telegramMtprotoService.send(bodyInput);
  }

  async webhook(secret: string | undefined, update: TelegramUpdate) {
    verifySecret(secret);
    const message = update.message;
    if (!message?.text) return { accepted: true };
    const chatId = String(message.chat.id);
    await this.repository.addMessage(chatId, "inbound", message.text, String(message.message_id));
    const response = await this.command(message);
    if (response) {
      const sent = await telegram("sendMessage", { chat_id: chatId, text: response });
      await this.repository.addMessage(chatId, "outbound", response, String(sent.message_id ?? ""));
    }
    return { accepted: true };
  }

  private async command(message: NonNullable<TelegramUpdate["message"]>) {
    const [command = "", argument = ""] = message.text.trim().split(/\s+/u);
    if (command === "/start" && argument) {
      const connected = await this.repository.connect(argument, String(message.chat.id), message.from?.username ?? "", [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" "));
      return connected ? "Connected to NEOT. You can now control tasks and receive notifications here." : "This connection link is invalid or already used.";
    }
    if (["/tasks", "/starttask", "/stoptask"].includes(command)) {
      return "Todos are private and are available only inside your NEOT account.";
    }
    if (command === "/help") return "Commands: /help";
    return null;
  }

  private async connected() {
    const connection = await this.repository.connection();
    if (!connection?.chat_id || connection.status !== "connected") throw AppError.validation("Connect Telegram first.");
    return connection;
  }
}

type TelegramUpdate = { message?: { chat: { id: number }; from?: { first_name?: string; last_name?: string; username?: string }; message_id: number; text: string } };

async function telegram(method: string, payload: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw AppError.validation("TELEGRAM_BOT_TOKEN is not configured.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { body: JSON.stringify(payload), headers: { "Content-Type": "application/json" }, method: "POST" });
  const result = await response.json() as { ok: boolean; result?: Record<string, unknown>; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description ?? "Telegram request failed.");
  return result.result ?? {};
}

function verifySecret(value: string | undefined) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expected || !value || expected.length !== value.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(value))) throw AppError.unauthorized("Invalid Telegram webhook secret.");
}
