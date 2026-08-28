import { Queue, Worker } from "bullmq";
import type { Kysely } from "kysely";
import nodemailer from "nodemailer";
import type { NEOTDatabase } from "../../database/schema.js";
import { NotificationRepository, isNotificationChannel } from "./notification.repository.js";
import type { NotificationEvent } from "./notification.types.js";

type RuntimeOptions = {
  database: Kysely<NEOTDatabase>;
  email: {
    fromEmail: string;
    fromName: string;
    host: string;
    password: string;
    port: number;
    secure: boolean;
    username: string;
  };
  redisUrl: string;
};

type Listener = (event: NotificationEvent) => void;
const listeners = new Set<Listener>();
let runtime: NotificationRuntime | null = null;

export async function configureNotificationRuntime(options: RuntimeOptions) {
  await runtime?.close();
  runtime = new NotificationRuntime(options);
  await runtime.start();
  return () => runtime?.close();
}

export function enqueueNotificationJobs(jobIds: string[]) {
  return runtime?.enqueue(jobIds) ?? Promise.resolve();
}

export function subscribeNotificationEvents(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

class NotificationRuntime {
  private readonly repository: NotificationRepository;
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly options: RuntimeOptions) {
    this.repository = new NotificationRepository(options.database);
  }

  async start() {
    if (this.options.redisUrl) {
      const connection = redisConnection(this.options.redisUrl);
      this.queue = new Queue("neot-notifications", { connection });
      await this.queue.waitUntilReady();
      this.worker = new Worker(
        "neot-notifications",
        (job) => this.process(String(job.data.jobId), "bullmq-redis"),
        { connection }
      );
    }
    this.timer = setInterval(() => {
      void this.drain();
    }, 5_000);
    await this.drain();
  }

  async enqueue(jobIds: string[]) {
    if (this.queue) {
      await Promise.all(
        jobIds.map((jobId) =>
          this.queue!.add(
            "notification.deliver",
            { jobId },
            {
              attempts: 5,
              backoff: { delay: 1000, type: "exponential" },
              jobId,
              removeOnComplete: 500,
              removeOnFail: false
            }
          )
        )
      );
      return;
    }
    await Promise.all(jobIds.map((jobId) => this.process(jobId, "database")));
  }

  async close() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close();
    await this.queue?.close();
  }

  private async drain() {
    const jobs = await this.repository.pendingJobs();
    await this.enqueue(jobs.map((job) => job.uuid));
  }

  private async process(jobId: string, backend: string) {
    const claimed = await this.repository.claimJob(jobId, backend);
    if (!claimed) return { skipped: true };
    const job = await this.repository.findJob(jobId);
    if (!job || !isNotificationChannel(job.channel)) return { skipped: true };
    try {
      if (job.channel === "email") await this.sendEmail(job);
      if (job.channel === "realtime")
        emit({
          actorId: job.recipient_actor_id,
          body: job.body,
          category: job.category,
          createdAt: new Date(job.created_at).toISOString(),
          id: job.notification_uuid,
          title: job.title
        });
      await this.repository.completeJob(jobId);
      return { delivered: true };
    } catch (error) {
      await this.repository.failJob(jobId, errorMessage(error), job.attempts + 1, job.max_attempts);
      throw error;
    }
  }

  private async sendEmail(
    job: NonNullable<Awaited<ReturnType<NotificationRepository["findJob"]>>>
  ) {
    if (!job.recipient_email) throw new Error("Notification email recipient is missing.");
    const settings = this.options.email;
    if (!settings.host || !settings.fromEmail)
      throw new Error("Notification SMTP is not configured.");
    const transport = nodemailer.createTransport({
      auth: settings.username ? { pass: settings.password, user: settings.username } : undefined,
      host: settings.host,
      port: settings.port,
      secure: settings.secure
    });
    await transport.sendMail({
      disableFileAccess: true,
      disableUrlAccess: true,
      from: settings.fromName
        ? { address: settings.fromEmail, name: settings.fromName }
        : settings.fromEmail,
      subject: job.title,
      text: job.body,
      to: job.recipient_email
    });
  }
}

function emit(event: NotificationEvent) {
  for (const listener of listeners) listener(event);
}

function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    db: url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : 0,
    host: url.hostname,
    maxRetriesPerRequest: null,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    port: url.port ? Number(url.port) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Notification delivery failed.";
}
