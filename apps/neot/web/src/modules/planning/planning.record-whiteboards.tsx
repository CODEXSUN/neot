import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import { usePlanningBoards } from "./planning.hooks";

export function ProjectWhiteboards({
  project,
}: {
  project: ProjectManagerRecord;
}) {
  const boards = usePlanningBoards({ kind: "project", uuid: project.id });
  const recent = boards.data?.[0];
  return (
    <div className="mt-2 rounded-md border bg-muted/20 p-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium">Whiteboards</span>
        <span className="text-muted-foreground">
          {boards.data?.length ?? 0} boards
          {recent
            ? ` · Last edited ${new Date(recent.updatedAt).toLocaleString()}`
            : ""}
        </span>
        <button
          className="text-primary hover:underline"
          type="button"
          onClick={() => openRecordWhiteboards(project)}
        >
          Create board
        </button>
        {recent ? (
          <button
            className="text-primary hover:underline"
            type="button"
            onClick={() =>
              window.location.assign(`/app/neot/planning/${recent.uuid}`)
            }
          >
            Open recent
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function openRecordWhiteboards(record: ProjectManagerRecord) {
  window.location.assign(
    `/app/neot/planning?recordKind=${encodeURIComponent(record.kind)}&recordUuid=${encodeURIComponent(record.id)}`,
  );
}
