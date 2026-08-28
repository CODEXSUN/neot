import { telegramMtprotoService } from "./telegram-mtproto.service.js";
import { TelegramSupportRepository } from "./telegram-support.repository.js";

export class TelegramNotificationService {
  constructor(private readonly repository = new TelegramSupportRepository()) {}

  async taskChanged(action: string, task: { id: string; status: string; title: string }) {
    const body = `Task ${action}\n${task.title}\n${task.id} · ${task.status}`;
    try {
      if (await telegramMtprotoService.sendNotification(body)) return;
    } catch (error) {
      console.warn("[telegram-support] MTProto task notification failed", error);
    }
    const connection = await this.repository.connection();
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!connection?.chat_id || connection.status !== "connected" || !token) return;
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        body: JSON.stringify({ chat_id: connection.chat_id, text: body }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const result = await response.json() as { ok: boolean; result?: { message_id?: number } };
      if (!response.ok || !result.ok) throw new Error("Telegram notification was rejected.");
      await this.repository.addMessage(connection.chat_id, "outbound", body, String(result.result?.message_id ?? ""));
    } catch (error) {
      console.warn("[telegram-support] task notification failed", error);
    }
  }
}
