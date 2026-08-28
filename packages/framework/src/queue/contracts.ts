export type QueueJob<TPayload = unknown> = {
  actorEmail?: string;
  correlationId?: string;
  idempotencyKey?: string;
  jobName: string;
  payload: TPayload;
  requestId?: string;
  retry?: {
    attempts: number;
    backoffMs: number;
  };
  sourceModule?: string;
  tenantId?: string;
};

export type QueueAdapter = {
  enqueue<TPayload>(queueName: string, job: QueueJob<TPayload>): Promise<void>;
};

export type QueueBackend = "bullmq-redis" | "database";

export type QueueDeliveryStatus =
  "accepted" | "cancelled" | "completed" | "dead-lettered" | "failed" | "pending" | "running";

export type QueueBackendHealth = {
  backend: QueueBackend;
  checkedAt: string;
  latencyMs: number;
  message?: string;
  status: "available" | "degraded" | "unavailable";
};

export type QueueJobV2<TPayload = unknown> = QueueJob<TPayload> & {
  idempotencyKey: string;
  jobVersion: number;
};

export type QueueEnqueueReceipt = {
  acceptedAt: string;
  backend: QueueBackend;
  deduplicated: boolean;
  jobId: string;
  status: QueueDeliveryStatus;
};

export type QueueAdapterV2 = {
  readonly backend: QueueBackend;
  cancel?(queueName: string, jobId: string): Promise<boolean>;
  close(): Promise<void>;
  enqueueJob<TPayload>(queueName: string, job: QueueJobV2<TPayload>): Promise<QueueEnqueueReceipt>;
  health(): Promise<QueueBackendHealth>;
  retry?(queueName: string, jobId: string): Promise<boolean>;
};

export class SwitchableQueueAdapter {
  private activeBackend: QueueBackend;
  private readonly adapters: Map<QueueBackend, QueueAdapterV2>;

  constructor(input: { adapters: readonly QueueAdapterV2[]; initialBackend?: QueueBackend }) {
    this.adapters = new Map(input.adapters.map((adapter) => [adapter.backend, adapter]));
    this.activeBackend = input.initialBackend ?? "database";
    if (!this.adapters.has(this.activeBackend)) {
      throw new Error(`Queue backend is not registered: ${this.activeBackend}`);
    }
  }

  backend() {
    return this.activeBackend;
  }

  current() {
    return this.requireAdapter(this.activeBackend);
  }

  async switchTo(backend: QueueBackend) {
    const adapter = this.requireAdapter(backend);
    const health = await adapter.health();
    if (health.status === "unavailable") {
      throw new Error(health.message || `Queue backend is unavailable: ${backend}`);
    }
    this.activeBackend = backend;
    return health;
  }

  async close() {
    await Promise.all([...this.adapters.values()].map((adapter) => adapter.close()));
  }

  private requireAdapter(backend: QueueBackend) {
    const adapter = this.adapters.get(backend);
    if (!adapter) throw new Error(`Queue backend is not registered: ${backend}`);
    return adapter;
  }
}

/**
 * Volatile queue collector for tests and local development. Production
 * compositions should inject a durable QueueAdapter implementation.
 */
export class InMemoryQueueAdapter implements QueueAdapter {
  readonly jobs: Array<{ job: QueueJob; queueName: string }> = [];

  async enqueue<TPayload>(queueName: string, job: QueueJob<TPayload>) {
    this.jobs.push({ job, queueName });
  }
}

export class InMemoryQueueAdapterV2 implements QueueAdapterV2 {
  readonly backend: QueueBackend;
  readonly jobs: Array<{
    job: QueueJobV2;
    queueName: string;
    receipt: QueueEnqueueReceipt;
  }> = [];

  constructor(backend: QueueBackend = "database") {
    this.backend = backend;
  }

  async enqueueJob<TPayload>(queueName: string, job: QueueJobV2<TPayload>) {
    const existing = this.jobs.find(
      (entry) => entry.queueName === queueName && entry.job.idempotencyKey === job.idempotencyKey
    );
    if (existing) return { ...existing.receipt, deduplicated: true };
    const receipt: QueueEnqueueReceipt = {
      acceptedAt: new Date().toISOString(),
      backend: this.backend,
      deduplicated: false,
      jobId: job.idempotencyKey,
      status: "accepted"
    };
    this.jobs.push({ job, queueName, receipt });
    return receipt;
  }

  async health(): Promise<QueueBackendHealth> {
    return {
      backend: this.backend,
      checkedAt: new Date().toISOString(),
      latencyMs: 0,
      status: "available"
    };
  }

  async close() {}
}
