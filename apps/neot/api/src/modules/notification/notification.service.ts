import { getNEOTDatabase } from "../../database/neot-database.js";
import { requireNEOTActor } from "../../request-context.js";
import { enqueueNotificationJobs } from "./notification.runtime.js";
import { NotificationRepository } from "./notification.repository.js";
import type { CreateNotificationInput } from "./notification.types.js";

export class NotificationService {
  private readonly repository = new NotificationRepository(getNEOTDatabase());

  async create(input: CreateNotificationInput) {
    const result = await this.repository.create(requireNEOTActor().id, input);
    await enqueueNotificationJobs(result.jobIds);
    return toNotification(result.notification);
  }

  async inbox() {
    const rows = await this.repository.list(requireNEOTActor().id);
    return rows.map(toNotification);
  }

  async markRead(uuid: string) {
    return toNotification(await this.repository.markRead(uuid, requireNEOTActor().id));
  }

  async queueSummary() {
    const rows = await this.repository.queueSummary();
    return Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));
  }

  async queueJobs() {
    const rows = await this.repository.queueJobs();
    return rows.map((row) => ({
      attempts: row.attempts,
      availableAt: new Date(row.available_at).toISOString(),
      backend: row.backend,
      channel: row.channel,
      createdAt: new Date(row.created_at).toISOString(),
      error: row.last_error,
      id: row.uuid,
      maxAttempts: row.max_attempts,
      notificationId: row.notification_uuid,
      status: row.status,
      updatedAt: new Date(row.updated_at).toISOString()
    }));
  }

  async retryJob(uuid: string) {
    await this.repository.retryJob(uuid);
    await enqueueNotificationJobs([uuid]);
    return { id: uuid, retried: true } as const;
  }
}

function toNotification(row: {
  action_url: string | null;
  body: string;
  category: string;
  created_at: Date;
  read_at: Date | null;
  status: string;
  title: string;
  uuid: string;
}) {
  return {
    actionUrl: row.action_url,
    body: row.body,
    category: row.category,
    createdAt: new Date(row.created_at).toISOString(),
    id: row.uuid,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    status: row.status,
    title: row.title
  };
}
