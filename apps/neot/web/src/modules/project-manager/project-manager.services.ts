import {
  apiBinaryPost,
  apiDelete,
  apiGet,
  apiGetBlob,
  apiPost,
  apiPut,
} from "../../shared/api/neot-api";
import type {
  ProjectManagerAttachment,
  ProjectManagerAttachmentKind,
  ProjectManagerKind,
  ProjectManagerRecord,
  ProjectManagerResult,
} from "./project-manager.types";

export function getProjectManagerResult() {
  return apiGet<ProjectManagerResult>("/admin/project-manager/result", "dev");
}

export function listProjectManagerRecords(kind: ProjectManagerKind) {
  return apiGet<ProjectManagerRecord[]>(
    `/admin/project-manager/${kind}`,
    "dev",
  );
}

export function createProjectManagerRecord(
  kind: ProjectManagerKind,
  payload: Record<string, unknown>,
) {
  return apiPost<ProjectManagerRecord>(
    `/admin/project-manager/${kind}`,
    payload,
    "dev",
  );
}

export function updateProjectManagerRecord(
  kind: ProjectManagerKind,
  id: string,
  payload: Record<string, unknown>,
) {
  return apiPut<ProjectManagerRecord>(
    `/admin/project-manager/${kind}/${id}`,
    payload,
    "dev",
  );
}

export function deactivateProjectManagerRecord(
  kind: ProjectManagerKind,
  id: string,
) {
  return apiPost<ProjectManagerRecord>(
    `/admin/project-manager/${kind}/${id}/deactivate`,
    {},
    "dev",
  );
}

export function restoreProjectManagerRecord(
  kind: ProjectManagerKind,
  id: string,
) {
  return apiPost<ProjectManagerRecord>(
    `/admin/project-manager/${kind}/${id}/restore`,
    {},
    "dev",
  );
}

export function deleteProjectManagerRecord(
  kind: ProjectManagerKind,
  id: string,
) {
  return apiDelete<{ deleted: boolean; id: string; title: string }>(
    `/admin/project-manager/${kind}/${id}`,
    "dev",
  );
}

export function listProjectManagerAttachments(
  kind: ProjectManagerAttachmentKind,
  recordId: string,
) {
  return apiGet<ProjectManagerAttachment[]>(
    `/admin/project-manager/${kind}/${recordId}/attachments`,
    "dev",
  );
}

export function uploadProjectManagerAttachment(
  kind: ProjectManagerAttachmentKind,
  recordId: string,
  file: File,
) {
  return apiBinaryPost<ProjectManagerAttachment>(
    `/admin/project-manager/${kind}/${recordId}/attachments`,
    file,
    {
      "X-File-Name": encodeURIComponent(file.name),
      "X-File-Type": attachmentMimeType(file),
    },
  );
}

export function deleteProjectManagerAttachment(
  kind: ProjectManagerAttachmentKind,
  recordId: string,
  attachmentId: string,
) {
  return apiDelete<{ deleted: boolean; id: string }>(
    `/admin/project-manager/${kind}/${recordId}/attachments/${attachmentId}`,
    "dev",
  );
}

export async function downloadProjectManagerAttachment(
  kind: ProjectManagerAttachmentKind,
  recordId: string,
  attachment: ProjectManagerAttachment,
) {
  const blob = await apiGetBlob(
    `/admin/project-manager/${kind}/${recordId}/attachments/${attachment.id}/download`,
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachment.originalName;
  link.click();
  URL.revokeObjectURL(url);
}

export function attachmentMimeType(file: File) {
  return (
    file.type || (file.name.toLowerCase().endsWith(".txt") ? "text/plain" : "")
  );
}
