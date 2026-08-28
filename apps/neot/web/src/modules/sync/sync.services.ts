import { apiDelete, apiGet, apiPost } from "../../shared/api/neot-api";
import type {
  GeneratedSyncToken,
  ProjectSyncVerification,
  SyncResult,
  SyncStatus,
  SyncTokenSummary
} from "./sync.types";

export const getSyncStatus = () => apiGet<SyncStatus>("/admin/sync/status");

export const generateSyncToken = (label: string) =>
  apiPost<GeneratedSyncToken>("/admin/sync/cloud/tokens", { label });

export const getSyncTokens = () => apiGet<SyncTokenSummary[]>("/admin/sync/cloud/tokens");

export const revokeSyncToken = (uuid: string) =>
  apiDelete<{ revoked: true; uuid: string }>(`/admin/sync/cloud/tokens/${uuid}`);

export const bindSyncCloud = (instanceId: string, token: string) =>
  apiPost<SyncStatus>("/admin/sync/bind", { instanceId, token });

export const verifySyncCloud = () => apiPost<SyncStatus>("/admin/sync/verify");

export const disconnectSyncCloud = () => apiDelete<SyncStatus>("/admin/sync/bind");

export const publishSyncCloud = () => apiPost<SyncResult>("/admin/sync/publish");

export const pullSyncCloud = () => apiPost<SyncResult>("/admin/sync/pull");

export const verifyProjectSync = () =>
  apiGet<ProjectSyncVerification>("/admin/sync/projects/verify");

export const previewProjectSync = () =>
  apiGet<ProjectSyncVerification>("/admin/sync/projects/preview");

export const publishProjects = () =>
  apiPost<SyncResult>("/admin/sync/projects/publish", {
    acceptLocal: true,
    acceptRemote: true
  });
