export type MessagingContact = { email: string; name: string; uuid: string };
export type MessagingAttachment = { dataUrl: string; kind: "file" | "image" | "voice"; name: string; size: number; type: string };
export type MessagingMessage = { attachment: MessagingAttachment | null; clientMessageId: string; content: string; conversationId: string; createdAt: string; deliveryStatus: "sent" | "delivered" | "read"; id: string; mentionIds: string[]; reactions: Array<{ emoji: string; userId: string; userName: string }>; senderId: string; senderName: string; sequence: number };
export type MessagingConversation = { createdAt: string; id: string; lastMessage: MessagingMessage | null; members: MessagingContact[]; title: string; type: "direct" | "group"; unreadCount: number; updatedAt: string };
