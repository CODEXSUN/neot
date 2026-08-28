export const NEOT_SYNC_CLOUD_URL = "https://neot.in";

export type NEOTSyncRole = "cloud" | "disabled" | "local";
export type NEOTSyncDirection = "inbound" | "local" | "outbound";
export type NEOTSyncState = "conflict" | "deleted" | "pending" | "synchronized";

export type NEOTSyncSnapshot = {
  attachmentData: Record<string, string>;
  instanceId: string;
  protocolVersion: 1;
  publishedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
};

export type NEOTSyncStatus = {
  bound: boolean;
  cloudUrl: typeof NEOT_SYNC_CLOUD_URL;
  conflictCount: number;
  instanceId: string;
  lastError: string | null;
  lastVerifiedAt: string | null;
  lastPulledAt: string | null;
  lastPublishedAt: string | null;
  pendingRecords: number;
  remoteRevision: number;
  role: NEOTSyncRole;
  status: "bound" | "conflict" | "disabled" | "error" | "unbound";
};

export type NEOTSyncTokenSummary = {
  createdAt: string;
  createdBy: string;
  label: string;
  lastUsedAt: string | null;
  status: "active" | "revoked";
  uuid: string;
};

export type NEOTSyncResult = {
  direction: "pull" | "push";
  records: number;
  revision: number;
  synchronizedAt: string;
};
