import type { ProjectManagerRecord } from "./project-manager.types.js";

export function shouldSyncProjectManagerRecord(
  record: Pick<ProjectManagerRecord, "active" | "status">
) {
  return record.active && record.status !== "archived";
}

export function buildProjectManagerSyncSummary(
  records: Array<Pick<ProjectManagerRecord, "active" | "status">>
) {
  const ready = records.filter(shouldSyncProjectManagerRecord).length;
  return { ready, skipped: records.length - ready, total: records.length };
}
