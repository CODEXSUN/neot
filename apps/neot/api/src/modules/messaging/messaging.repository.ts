import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import { sql, type Kysely } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type { NEOTDatabase } from "../../database/schema.js";
import type { MessagingAttachment, MessagingContact, MessagingConversation, MessagingMessage } from "./messaging.types.js";

type ConversationRow = { created_at: Date | string; created_by_uuid: string; last_sequence: number; title: string; type: "direct" | "group"; updated_at: Date | string; uuid: string };
type MemberRow = { conversation_uuid: string; last_read_sequence: number; role: string; user_email: string; user_name: string; user_uuid: string };
type MessageRow = { attachment_json: string; client_message_id: string; content: string; conversation_uuid: string; created_at: Date | string; mention_ids_json: string; sender_name: string; sender_uuid: string; sequence_number: number; uuid: string };
type ReactionRow = { emoji: string; message_uuid: string; user_name: string; user_uuid: string };

export class MessagingRepository {
  constructor(private readonly database: Kysely<NEOTDatabase> = getNEOTDatabase()) {}

  async list(actorId: string) {
    const conversations = await sql<ConversationRow>`SELECT c.* FROM neot_messaging_conversations c
      INNER JOIN neot_messaging_members m ON m.conversation_uuid = c.uuid
      WHERE m.user_uuid = ${actorId} ORDER BY c.updated_at DESC`.execute(this.database);
    return Promise.all(conversations.rows.map((row) => this.mapConversation(row, actorId)));
  }

  async find(id: string, actorId: string) {
    const rows = await sql<ConversationRow>`SELECT c.* FROM neot_messaging_conversations c
      INNER JOIN neot_messaging_members m ON m.conversation_uuid = c.uuid
      WHERE c.uuid = ${id} AND m.user_uuid = ${actorId} LIMIT 1`.execute(this.database);
    return rows.rows[0] ? this.mapConversation(rows.rows[0], actorId) : null;
  }

  async findDirect(actorId: string, otherId: string) {
    const rows = await sql<ConversationRow>`SELECT c.* FROM neot_messaging_conversations c
      INNER JOIN neot_messaging_members mine ON mine.conversation_uuid = c.uuid AND mine.user_uuid = ${actorId}
      INNER JOIN neot_messaging_members other ON other.conversation_uuid = c.uuid AND other.user_uuid = ${otherId}
      WHERE c.type = 'direct' AND (SELECT COUNT(*) FROM neot_messaging_members x WHERE x.conversation_uuid = c.uuid) = 2
      LIMIT 1`.execute(this.database);
    return rows.rows[0] ? this.mapConversation(rows.rows[0], actorId) : null;
  }

  async create(type: "direct" | "group", title: string, creator: MessagingContact, members: MessagingContact[]) {
    const id = randomBytes(4).toString("hex");
    await this.database.transaction().execute(async (trx) => {
      await sql`INSERT INTO neot_messaging_conversations (uuid, type, title, created_by_uuid)
        VALUES (${id}, ${type}, ${title}, ${creator.uuid})`.execute(trx);
      for (const member of members) {
        await sql`INSERT INTO neot_messaging_members
          (conversation_uuid, user_uuid, user_name, user_email, role)
          VALUES (${id}, ${member.uuid}, ${member.name}, ${member.email}, ${member.uuid === creator.uuid ? "owner" : "member"})`.execute(trx);
      }
    });
    return this.find(id, creator.uuid);
  }

  async messages(conversationId: string, actorId: string) {
    await this.requireMember(conversationId, actorId);
    const rows = await sql<MessageRow>`SELECT * FROM neot_messaging_messages
      WHERE conversation_uuid = ${conversationId} ORDER BY sequence_number ASC LIMIT 500`.execute(this.database);
    const members = await sql<MemberRow>`SELECT * FROM neot_messaging_members
      WHERE conversation_uuid = ${conversationId}`.execute(this.database);
    const reactions = await this.reactions(rows.rows.map((row) => row.uuid));
    return rows.rows.map((row) => mapMessage(row, deliveryStatus(row, members.rows), reactions.filter((reaction) => reaction.message_uuid === row.uuid)));
  }

  async send(conversationId: string, actor: MessagingContact, content: string, clientMessageId: string, mentionIds: string[], attachment: MessagingAttachment | null) {
    await this.requireMember(conversationId, actor.uuid);
    const existing = await sql<MessageRow>`SELECT * FROM neot_messaging_messages
      WHERE conversation_uuid = ${conversationId} AND client_message_id = ${clientMessageId} LIMIT 1`.execute(this.database);
    if (existing.rows[0]) return mapMessage(existing.rows[0], "delivered", []);
    const row = await this.database.transaction().execute(async (trx) => {
      await sql`UPDATE neot_messaging_conversations SET last_sequence = last_sequence + 1
        WHERE uuid = ${conversationId}`.execute(trx);
      const sequence = await sql<{ last_sequence: number }>`SELECT last_sequence FROM neot_messaging_conversations
        WHERE uuid = ${conversationId}`.execute(trx);
      const id = randomBytes(4).toString("hex");
      await sql`INSERT INTO neot_messaging_messages
        (uuid, conversation_uuid, sender_uuid, sender_name, content, sequence_number, client_message_id, mention_ids_json, attachment_json)
        VALUES (${id}, ${conversationId}, ${actor.uuid}, ${actor.name}, ${content}, ${sequence.rows[0]?.last_sequence ?? 1}, ${clientMessageId}, ${JSON.stringify(mentionIds)}, ${JSON.stringify(attachment)})`.execute(trx);
      await sql`UPDATE neot_messaging_conversations SET updated_at = CURRENT_TIMESTAMP WHERE uuid = ${conversationId}`.execute(trx);
      const saved = await sql<MessageRow>`SELECT * FROM neot_messaging_messages WHERE uuid = ${id}`.execute(trx);
      return saved.rows[0];
    });
    if (!row) throw new Error("Message could not be saved.");
    return mapMessage(row, "delivered", []);
  }

  async react(conversationId: string, messageId: string, actor: MessagingContact, emoji: string | null) {
    await this.requireMember(conversationId, actor.uuid);
    const rows = await sql<MessageRow>`SELECT * FROM neot_messaging_messages
      WHERE uuid = ${messageId} AND conversation_uuid = ${conversationId} LIMIT 1`.execute(this.database);
    const message = rows.rows[0];
    if (!message) throw AppError.notFound("Message was not found.");
    if (emoji) {
      await sql`INSERT INTO neot_messaging_reactions (message_uuid, user_uuid, user_name, emoji)
        VALUES (${messageId}, ${actor.uuid}, ${actor.name}, ${emoji})
        ON DUPLICATE KEY UPDATE user_name = VALUES(user_name), emoji = VALUES(emoji), created_at = CURRENT_TIMESTAMP`.execute(this.database);
    } else {
      await sql`DELETE FROM neot_messaging_reactions WHERE message_uuid = ${messageId} AND user_uuid = ${actor.uuid}`.execute(this.database);
    }
    const members = await sql<MemberRow>`SELECT * FROM neot_messaging_members WHERE conversation_uuid = ${conversationId}`.execute(this.database);
    return mapMessage(message, deliveryStatus(message, members.rows), await this.reactions([messageId]));
  }

  async markRead(conversationId: string, actorId: string, sequence: number) {
    await this.requireMember(conversationId, actorId);
    const result = await sql`UPDATE neot_messaging_members SET last_read_sequence = ${sequence}
      WHERE conversation_uuid = ${conversationId} AND user_uuid = ${actorId}
        AND last_read_sequence < ${sequence}`.execute(this.database);
    return Number(result.numAffectedRows ?? 0) > 0;
  }

  async memberIds(conversationId: string) {
    const rows = await sql<{ user_uuid: string }>`SELECT user_uuid FROM neot_messaging_members
      WHERE conversation_uuid = ${conversationId}`.execute(this.database);
    return rows.rows.map((row) => row.user_uuid);
  }

  private async requireMember(conversationId: string, actorId: string) {
    const rows = await sql<{ count: number | string }>`SELECT COUNT(*) count FROM neot_messaging_members
      WHERE conversation_uuid = ${conversationId} AND user_uuid = ${actorId}`.execute(this.database);
    if (Number(rows.rows[0]?.count ?? 0) < 1) throw AppError.notFound("Conversation was not found.");
  }

  private async mapConversation(row: ConversationRow, actorId: string): Promise<MessagingConversation> {
    const members = await sql<MemberRow>`SELECT * FROM neot_messaging_members WHERE conversation_uuid = ${row.uuid}`.execute(this.database);
    const last = await sql<MessageRow>`SELECT * FROM neot_messaging_messages WHERE conversation_uuid = ${row.uuid}
      ORDER BY sequence_number DESC LIMIT 1`.execute(this.database);
    const mine = members.rows.find((member) => member.user_uuid === actorId);
    return {
      createdAt: iso(row.created_at), id: row.uuid,
      lastMessage: last.rows[0] ? mapMessage(last.rows[0], deliveryStatus(last.rows[0], members.rows), []) : null,
      members: members.rows.map(({ user_email, user_name, user_uuid }) => ({ email: user_email, name: user_name, uuid: user_uuid })),
      title: row.title, type: row.type, unreadCount: Math.max(0, row.last_sequence - (mine?.last_read_sequence ?? 0)),
      updatedAt: iso(row.updated_at)
    };
  }

  private async reactions(messageIds: string[]) {
    if (!messageIds.length) return [];
    const rows = await sql<ReactionRow>`SELECT message_uuid, user_uuid, user_name, emoji
      FROM neot_messaging_reactions WHERE message_uuid IN (${sql.join(messageIds)})`.execute(this.database);
    return rows.rows;
  }
}

function mapMessage(row: MessageRow, status: MessagingMessage["deliveryStatus"], reactions: ReactionRow[]): MessagingMessage {
  return { attachment: parseAttachment(row.attachment_json), clientMessageId: row.client_message_id, content: row.content, conversationId: row.conversation_uuid,
    createdAt: iso(row.created_at), deliveryStatus: status, id: row.uuid, mentionIds: parseIds(row.mention_ids_json),
    reactions: reactions.map(({ emoji, user_name, user_uuid }) => ({ emoji, userId: user_uuid, userName: user_name })),
    senderId: row.sender_uuid, senderName: row.sender_name, sequence: row.sequence_number };
}
function deliveryStatus(row: MessageRow, members: MemberRow[]): MessagingMessage["deliveryStatus"] {
  const recipients = members.filter((member) => member.user_uuid !== row.sender_uuid);
  return recipients.length > 0 && recipients.every((member) => member.last_read_sequence >= row.sequence_number)
    ? "read"
    : "delivered";
}
function iso(value: Date | string) { return value instanceof Date ? value.toISOString() : new Date(value).toISOString(); }
function parseIds(value: string) { try { const parsed = JSON.parse(value) as unknown; return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []; } catch { return []; } }
function parseAttachment(value: string): MessagingAttachment | null { try { const parsed = JSON.parse(value) as MessagingAttachment | null; return parsed?.dataUrl && parsed.name ? parsed : null; } catch { return null; } }
