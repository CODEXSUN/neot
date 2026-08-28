import { apiGet, apiPost } from "../../shared/api/neot-api";
import type { MessagingAttachment, MessagingContact, MessagingConversation, MessagingMessage } from "./messaging.types";

export const listMessagingContacts = (search = "") => apiGet<MessagingContact[]>(`/messaging/contacts?search=${encodeURIComponent(search)}`);
export const listConversations = () => apiGet<MessagingConversation[]>("/messaging/conversations");
export const createConversation = (memberId: string) => apiPost<MessagingConversation>("/messaging/conversations", { memberIds: [memberId], type: "direct" });
export const listMessages = (id: string) => apiGet<MessagingMessage[]>(`/messaging/conversations/${id}/messages`);
export const sendMessage = (id: string, content: string, mentionIds: string[] = [], attachment: MessagingAttachment | null = null) => apiPost<MessagingMessage>(`/messaging/conversations/${id}/messages`, { attachment, clientMessageId: crypto.randomUUID(), content, mentionIds });
export const reactToMessage = (conversationId: string, messageId: string, emoji: string | null) => apiPost<MessagingMessage>(`/messaging/conversations/${conversationId}/messages/${messageId}/reaction`, { emoji });
export const markConversationRead = (id: string, sequence: number) => apiPost<{ read: true }>(`/messaging/conversations/${id}/read`, { sequence });
