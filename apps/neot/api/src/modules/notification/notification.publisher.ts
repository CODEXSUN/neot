import { getNEOTDatabase } from "../../database/neot-database.js";
import { enqueueNotificationJobs } from "./notification.runtime.js";
import { NotificationRepository } from "./notification.repository.js";
import type { CreateNotificationInput } from "./notification.types.js";

export const notificationPublisher = {
  async publish(actorId: string, input: CreateNotificationInput) {
    const repository = new NotificationRepository(getNEOTDatabase());
    const result = await repository.create(actorId, input);
    await enqueueNotificationJobs(result.jobIds);
    return result.notification.uuid;
  }
};
