export type NotificationChannel = "email" | "realtime";

export type CreateNotificationInput = {
  actionUrl?: string | null | undefined;
  body: string;
  category: string;
  channels: NotificationChannel[];
  idempotencyKey: string;
  recipientActorId: string;
  recipientEmail?: string | null | undefined;
  title: string;
};

export type NotificationEvent = {
  actorId: string;
  body: string;
  category: string;
  createdAt: string;
  id: string;
  title: string;
};
