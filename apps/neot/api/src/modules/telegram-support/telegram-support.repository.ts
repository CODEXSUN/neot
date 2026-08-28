import { createHash, randomBytes } from "node:crypto";
import type { Kysely } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type { NEOTDatabase } from "../../database/schema.js";

export class TelegramSupportRepository {
  constructor(private readonly database: Kysely<NEOTDatabase> = getNEOTDatabase()) {}

  async connection() {
    return this.database.selectFrom("neot_telegram_connections").selectAll().orderBy("created_at", "desc").executeTakeFirst();
  }

  async createConnection(token: string) {
    const uuid = randomBytes(8).toString("hex");
    await this.database.insertInto("neot_telegram_connections").values({
      auth_mode: "bot", chat_id: null, connected_at: null, display_name: "", encrypted_session: null, link_token_hash: hash(token),
      status: "pending", telegram_username: "", uuid
    }).executeTakeFirstOrThrow();
    return uuid;
  }

  async mtprotoConnection() {
    return this.database.selectFrom("neot_telegram_connections").selectAll()
      .where("auth_mode", "=", "mtproto").orderBy("created_at", "desc").executeTakeFirst();
  }

  async saveMtprotoConnection(input: { encryptedSession: string; id: string; username: string; displayName: string }) {
    await this.database.updateTable("neot_telegram_connections")
      .set({ status: "disconnected", updated_at: new Date() })
      .where("auth_mode", "=", "mtproto").where("status", "=", "connected").execute();
    await this.database.insertInto("neot_telegram_connections").values({
      auth_mode: "mtproto", chat_id: input.id, connected_at: new Date(), display_name: input.displayName,
      encrypted_session: input.encryptedSession, link_token_hash: hash(randomBytes(24).toString("base64url")),
      status: "connected", telegram_username: input.username, uuid: randomBytes(8).toString("hex")
    }).executeTakeFirstOrThrow();
  }

  async disconnectMtproto() {
    await this.database.updateTable("neot_telegram_connections")
      .set({ encrypted_session: null, status: "disconnected", updated_at: new Date() })
      .where("auth_mode", "=", "mtproto").where("status", "=", "connected").execute();
  }

  async connect(token: string, chatId: string, username: string, displayName: string) {
    const result = await this.database.updateTable("neot_telegram_connections").set({
      chat_id: chatId, connected_at: new Date(), display_name: displayName,
      status: "connected", telegram_username: username, updated_at: new Date()
    }).where("link_token_hash", "=", hash(token)).where("status", "=", "pending")
      .where("created_at", ">", new Date(Date.now() - 15 * 60 * 1000)).executeTakeFirst();
    return Number(result.numUpdatedRows) > 0;
  }

  async disconnect() {
    await this.database.updateTable("neot_telegram_connections").set({ status: "disconnected", updated_at: new Date() }).where("status", "=", "connected").execute();
  }

  async messages(chatId: string) {
    const rows = await this.database.selectFrom("neot_telegram_messages").selectAll().where("chat_id", "=", chatId).orderBy("created_at", "asc").limit(200).execute();
    return rows.map((row) => ({ body: row.body, createdAt: new Date(row.created_at).toISOString(), direction: row.direction, id: row.uuid }));
  }

  async addMessage(chatId: string, direction: "inbound" | "outbound", body: string, telegramMessageId?: string) {
    await this.database.insertInto("neot_telegram_messages").values({
      body, chat_id: chatId, direction, telegram_message_id: telegramMessageId ?? null,
      uuid: randomBytes(8).toString("hex")
    }).executeTakeFirstOrThrow();
  }
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
