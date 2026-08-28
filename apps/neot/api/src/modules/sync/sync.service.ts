import { AppError } from "@neot/framework/errors";
import {
  decryptSyncToken,
  encryptSyncToken,
  generateSyncToken,
  snapshotChecksum,
  syncTokenHash
} from "./sync.crypto.js";
import { NEOTSyncRepository, synchronizedTables } from "./sync.repository.js";
import {
  NEOT_SYNC_CLOUD_URL,
  type NEOTSyncResult,
  type NEOTSyncRole,
  type NEOTSyncSnapshot,
  type NEOTSyncStatus,
  type NEOTSyncTokenSummary
} from "./sync.types.js";

type CloudSnapshotEnvelope = {
  checksum: string;
  revision: number;
  snapshot: NEOTSyncSnapshot;
};

export class NEOTSyncService {
  constructor(private readonly repository = new NEOTSyncRepository()) {}

  role(): NEOTSyncRole {
    const role = process.env.NEOT_SYNC_ROLE?.trim().toLowerCase() || "local";
    if (!["cloud", "disabled", "local"].includes(role)) {
      throw new Error("NEOT_SYNC_ROLE must be cloud, local, or disabled.");
    }
    return role as NEOTSyncRole;
  }

  async status(): Promise<NEOTSyncStatus> {
    const [connection, conflicts, pendingRecords] = await Promise.all([
      this.repository.connection(),
      this.repository.conflictCount(),
      this.repository.pendingCount()
    ]);
    const role = this.role();
    const connectionStatus =
      role === "disabled"
        ? "disabled"
        : connection?.status === "conflict"
          ? "conflict"
          : connection?.status === "error"
            ? "error"
            : connection
              ? "bound"
              : "unbound";
    return {
      bound: Boolean(connection),
      cloudUrl: NEOT_SYNC_CLOUD_URL,
      conflictCount: conflicts,
      instanceId: connection?.instance_id ?? process.env.NEOT_SYNC_INSTANCE_ID?.trim() ?? "",
      lastError: connection?.last_error ?? null,
      lastVerifiedAt: iso(connection?.last_verified_at),
      lastPulledAt: iso(connection?.last_pulled_at),
      lastPublishedAt: iso(connection?.last_published_at),
      pendingRecords,
      remoteRevision: connection?.remote_revision ?? 0,
      role,
      status: connectionStatus
    };
  }

  async generateCloudToken(label: string, actor: string) {
    this.requireRole("cloud");
    const token = generateSyncToken();
    await this.repository.createToken({
      actor,
      hash: syncTokenHash(token),
      label: requiredLabel(label)
    });
    return {
      createdAt: new Date().toISOString(),
      label: requiredLabel(label),
      token
    };
  }

  async cloudTokens(): Promise<NEOTSyncTokenSummary[]> {
    this.requireRole("cloud");
    const tokens = await this.repository.listTokens();
    return tokens.map((token) => ({
      createdAt: new Date(token.created_at).toISOString(),
      createdBy: token.created_by,
      label: token.label,
      lastUsedAt: iso(token.last_used_at),
      status: token.status === "active" ? "active" : "revoked",
      uuid: token.uuid
    }));
  }

  async revokeCloudToken(uuid: string) {
    this.requireRole("cloud");
    if (!(await this.repository.revokeToken(uuid))) {
      throw AppError.validation("The cloud token is missing or already revoked.");
    }
    return { revoked: true as const, uuid };
  }

  async bind(token: string, instanceId: string) {
    this.requireRole("local");
    const normalizedToken = requiredToken(token);
    const normalizedInstance = requiredInstanceId(instanceId);
    await cloudRequest<{ valid: true }>("/v1/status", normalizedToken);
    await this.repository.saveConnection({
      encryptedToken: encryptSyncToken(normalizedToken),
      instanceId: normalizedInstance
    });
    return this.status();
  }

  async verify() {
    this.requireRole("local");
    const connection = await this.requiredConnection();
    const token = decryptSyncToken(connection.encrypted_token);
    try {
      const remote = await cloudRequest<{
        label: string;
        protocolVersion: number;
        revision: number;
        serverId: string;
        valid: true;
      }>("/v1/status", token);
      await this.repository.updateConnection({
        error: null,
        revision: remote.revision,
        status: "bound",
        verifiedAt: new Date()
      });
      return this.status();
    } catch (error) {
      await this.repository.updateConnection({ error: errorMessage(error), status: "error" });
      throw error;
    }
  }

  async disconnect() {
    this.requireRole("local");
    await this.repository.deleteConnection();
    return this.status();
  }

  async verifyProjectConnection() {
    this.requireRole("local");
    const connection = await this.requiredConnection();
    const token = decryptSyncToken(connection.encrypted_token);
    const remote = await cloudRequest<{
      label: string;
      protocolVersion: number;
      revision: number;
      serverId: string;
      valid: true;
    }>("/v1/status", token);
    const counts = await this.repository.projectCounts();
    return {
      cloudUrl: NEOT_SYNC_CLOUD_URL,
      instanceId: connection.instance_id,
      localAccepted: true as const,
      pendingProjects: counts.pending,
      projectCount: counts.total,
      remoteAccepted: remote.valid,
      remoteLabel: remote.label,
      remoteRevision: remote.revision,
      verifiedAt: new Date().toISOString()
    };
  }

  async projectPreview() {
    const verification = await this.verifyProjectConnection();
    return { ...verification, scope: "projects" as const };
  }

  async publishProjects(acceptLocal: boolean, acceptRemote: boolean): Promise<NEOTSyncResult> {
    if (!acceptLocal || !acceptRemote) {
      throw AppError.validation("Local and remote acceptance are required before project sync.");
    }
    const verification = await this.verifyProjectConnection();
    if (!verification.remoteAccepted)
      throw AppError.validation("Cloud portal verification failed.");
    const connection = await this.requiredConnection();
    const run = await this.repository.startRun("push", connection.remote_revision);
    try {
      const token = decryptSyncToken(connection.encrypted_token);
      const snapshot = await this.repository.exportProjectSnapshot(connection.instance_id);
      const response = await cloudRequest<{
        records: number;
        revision: number;
        synchronizedAt: string;
      }>("/v1/snapshot", token, { baseRevision: connection.remote_revision, snapshot });
      await this.repository.updateConnection({
        error: null,
        publishedAt: new Date(response.synchronizedAt),
        revision: response.revision,
        status: "bound"
      });
      await this.repository.markProjectsPublished();
      await this.repository.finishRun(run, {
        records: response.records,
        remoteRevision: response.revision,
        status: "completed"
      });
      return { direction: "push", ...response };
    } catch (error) {
      const message = errorMessage(error);
      await this.repository.updateConnection({ error: message, status: "error" });
      await this.repository.finishRun(run, { error: message, status: "failed" });
      throw error;
    }
  }

  async publish(): Promise<NEOTSyncResult> {
    this.requireRole("local");
    const connection = await this.requiredConnection();
    const run = await this.repository.startRun("push", connection.remote_revision);
    try {
      const token = decryptSyncToken(connection.encrypted_token);
      const snapshot = await this.repository.exportSnapshot(connection.instance_id);
      const response = await cloudRequest<{
        records: number;
        revision: number;
        synchronizedAt: string;
      }>("/v1/snapshot", token, {
        baseRevision: connection.remote_revision,
        snapshot
      });
      await this.repository.updateConnection({
        error: null,
        publishedAt: new Date(response.synchronizedAt),
        revision: response.revision,
        status: "bound"
      });
      await this.repository.markPublished();
      await this.repository.finishRun(run, {
        records: response.records,
        remoteRevision: response.revision,
        status: "completed"
      });
      return { direction: "push", ...response };
    } catch (error) {
      const message = errorMessage(error);
      const conflict = error instanceof AppError && error.statusCode === 409;
      await this.repository.updateConnection({
        error: message,
        status: conflict ? "conflict" : "error"
      });
      if (conflict) {
        await this.repository.recordConflict({
          instanceId: connection.instance_id,
          localRevision: connection.remote_revision,
          message,
          remoteRevision: remoteRevision(message)
        });
      }
      await this.repository.finishRun(run, {
        error: message,
        status: conflict ? "conflict" : "failed"
      });
      throw error;
    }
  }

  async pull(): Promise<NEOTSyncResult> {
    this.requireRole("local");
    const connection = await this.requiredConnection();
    const run = await this.repository.startRun("pull", connection.remote_revision);
    try {
      const token = decryptSyncToken(connection.encrypted_token);
      const response = await cloudRequest<CloudSnapshotEnvelope>("/v1/snapshot", token);
      const pendingRecords = await this.repository.pendingCount();
      if (pendingRecords > 0 && response.revision > connection.remote_revision) {
        const message = `Cloud revision is ${response.revision}, but this installation has ${pendingRecords} pending local records. Publish or resolve local changes before pulling.`;
        await this.repository.recordConflict({
          instanceId: connection.instance_id,
          localRevision: connection.remote_revision,
          message,
          remoteRevision: response.revision
        });
        throw AppError.conflict(message);
      }
      const payload = JSON.stringify(response.snapshot);
      if (snapshotChecksum(payload) !== response.checksum) {
        throw AppError.validation("Cloud snapshot checksum validation failed.");
      }
      const records = await this.repository.importSnapshot(response.snapshot);
      const synchronizedAt = new Date().toISOString();
      await this.repository.updateConnection({
        error: null,
        pulledAt: new Date(synchronizedAt),
        revision: response.revision,
        status: "bound"
      });
      await this.repository.finishRun(run, {
        records,
        remoteRevision: response.revision,
        status: "completed"
      });
      return {
        direction: "pull",
        records,
        revision: response.revision,
        synchronizedAt
      };
    } catch (error) {
      const message = errorMessage(error);
      const conflict = error instanceof AppError && error.statusCode === 409;
      await this.repository.updateConnection({
        error: message,
        status: conflict ? "conflict" : "error"
      });
      await this.repository.finishRun(run, {
        error: message,
        status: conflict ? "conflict" : "failed"
      });
      throw error;
    }
  }

  async authenticateCloudToken(token: string) {
    this.requireRole("cloud");
    const normalized = requiredToken(token);
    const record = await this.repository.findActiveToken(syncTokenHash(normalized));
    if (!record) throw AppError.unauthorized("NEOT sync token is invalid.");
    await this.repository.touchToken(record.uuid);
    return record;
  }

  async cloudStatus(token: string) {
    const record = await this.authenticateCloudToken(token);
    const snapshot = await this.repository.latestSnapshot();
    return {
      label: record.label,
      protocolVersion: 1,
      revision: snapshot?.revision ?? 0,
      serverId: "codexsun-cloud",
      valid: true as const
    };
  }

  async cloudSnapshot(token: string): Promise<CloudSnapshotEnvelope> {
    await this.authenticateCloudToken(token);
    const current = await this.repository.latestSnapshot();
    const snapshot = current
      ? parseSnapshot(current.payload_json)
      : await this.repository.exportSnapshot("codexsun-cloud");
    const payload = JSON.stringify(snapshot);
    return {
      checksum: current?.checksum ?? snapshotChecksum(payload),
      revision: current?.revision ?? 0,
      snapshot
    };
  }

  async cloudPublish(token: string, baseRevision: number, snapshot: NEOTSyncSnapshot) {
    const tokenRecord = await this.authenticateCloudToken(token);
    validateSnapshot(snapshot);
    const current = await this.repository.latestSnapshot();
    const currentRevision = current?.revision ?? 0;
    if (baseRevision !== currentRevision) {
      throw AppError.conflict(
        `Cloud revision is ${currentRevision}; pull before publishing again.`
      );
    }
    const payload = JSON.stringify(snapshot);
    const revision = currentRevision + 1;
    const records = await this.repository.importSnapshot(snapshot);
    await this.repository.saveSnapshot({
      checksum: snapshotChecksum(payload),
      payload,
      publisher: `${tokenRecord.label}:${snapshot.instanceId}`,
      revision
    });
    return {
      records,
      revision,
      synchronizedAt: new Date().toISOString()
    };
  }

  private async requiredConnection() {
    const connection = await this.repository.connection();
    if (!connection)
      throw AppError.validation("Bind this NEOT installation to the cloud before synchronizing.");
    return connection;
  }

  private requireRole(expected: NEOTSyncRole) {
    if (this.role() !== expected) {
      throw AppError.forbidden(`NEOT sync operation requires the ${expected} runtime role.`);
    }
  }
}

async function cloudRequest<T>(path: string, token: string, body?: unknown): Promise<T> {
  const response = await fetch(`${cloudUrl()}${path}`, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      "x-neot-sync-token": token
    },
    method: body === undefined ? "GET" : "POST",
    signal: AbortSignal.timeout(15_000)
  });
  const result = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string };
    success?: boolean;
  } | null;
  if (!response.ok || !result?.success || result.data === undefined) {
    throw new AppError({
      code: response.status === 409 ? "SYNC_CONFLICT" : "SYNC_REMOTE_ERROR",
      message:
        result?.error?.message ?? `NEOT cloud synchronization failed (${response.status}).`,
      statusCode: response.status === 409 ? 409 : 502
    });
  }
  return result.data;
}

function cloudUrl() {
  const testUrl =
    process.env.NODE_ENV === "test" ? process.env.NEOT_SYNC_TEST_CLOUD_URL?.trim() : "";
  return `${testUrl || `${NEOT_SYNC_CLOUD_URL}/api/neot/sync/cloud`}`.replace(/\/+$/u, "");
}

function requiredLabel(value: string) {
  const label = value.trim();
  if (!label || label.length > 160) throw AppError.validation("Sync token label is required.");
  return label;
}

function requiredToken(value: string) {
  const token = value.trim();
  if (!/^[A-Za-z0-9]{16}$/u.test(token))
    throw AppError.validation("NEOT sync token must contain 16 characters.");
  return token;
}

function requiredInstanceId(value: string) {
  const instanceId = value.trim();
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$/u.test(instanceId)) {
    throw AppError.validation(
      "Instance ID must contain 2-80 letters, numbers, underscores, or hyphens."
    );
  }
  return instanceId;
}

function validateSnapshot(snapshot: NEOTSyncSnapshot) {
  if (snapshot.protocolVersion !== 1)
    throw AppError.validation("NEOT sync protocol version is unsupported.");
  for (const table of Object.keys(snapshot.tables)) {
    if (!synchronizedTables.includes(table as (typeof synchronizedTables)[number])) {
      throw AppError.validation(`NEOT sync table is not allowed: ${table}.`);
    }
  }
}

function parseSnapshot(value: string) {
  return JSON.parse(value) as NEOTSyncSnapshot;
}

function iso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown synchronization error.";
}

function remoteRevision(message: string) {
  const match = /Cloud revision is (\d+)/u.exec(message);
  return match ? Number(match[1]) : 0;
}
