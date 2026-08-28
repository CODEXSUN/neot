import { formatDistanceToNow } from "date-fns";
import { ArchiveRestoreIcon, BanIcon, GitBranchIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { StatusBadge } from "@neot/ui";
import { Button } from "@neot/ui/components/button";
import { WorkspaceTableEmptyState } from "@neot/ui/workspace/table";
import type { ProjectManagerRecord } from "./project-manager.types";

export function ProjectManagerList({
  records,
  onDeactivate,
  onDelete,
  onDrill,
  onEdit,
  onRestore
}: {
  records: ProjectManagerRecord[];
  onDeactivate: (record: ProjectManagerRecord) => void;
  onDelete: (record: ProjectManagerRecord) => void;
  onDrill?: (record: ProjectManagerRecord) => void;
  onEdit: (record: ProjectManagerRecord) => void;
  onRestore: (record: ProjectManagerRecord) => void;
}) {
  if (!records.length)
    return <WorkspaceTableEmptyState>No project records found.</WorkspaceTableEmptyState>;
  return (
    <div className="overflow-x-auto rounded-md border bg-card shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold">Work</th>
            <th className="px-4 py-3 text-left font-semibold">Status</th>
            <th className="px-4 py-3 text-left font-semibold">Owner</th>
            <th className="px-4 py-3 text-left font-semibold">Reference</th>
            <th className="px-4 py-3 text-left font-semibold">Updated</th>
            <th className="px-4 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr className="border-t align-top" key={record.id}>
              <td className="px-4 py-3">
                <div className="font-medium">{record.title}</div>
                <div className="font-mono text-xs text-muted-foreground">{record.key}</div>
                {record.description ? (
                  <div className="mt-1 max-w-xl text-xs text-muted-foreground">
                    {record.description}
                  </div>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <StatusBadge tone={record.active ? statusTone(record.status) : "neutral"}>
                  {record.active ? record.status : "inactive"}
                </StatusBadge>
                <div className="mt-2 text-xs text-muted-foreground">{record.priority}</div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {record.assignee || record.moduleKey || "-"}
              </td>
              <td className="px-4 py-3">
                <div className="font-mono text-xs text-muted-foreground">
                  {record.referenceId || "-"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {record.referenceType || record.type}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDistanceToNow(new Date(record.updatedAt), { addSuffix: true })}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  {onDrill ? (
                    <Button size="sm" variant="outline" onClick={() => onDrill(record)}>
                      <GitBranchIcon className="size-4" />
                      Drill
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => onEdit(record)}>
                    <PencilIcon className="size-4" />
                    Edit
                  </Button>
                  {record.active ? (
                    <Button size="sm" variant="outline" onClick={() => onDeactivate(record)}>
                      <BanIcon className="size-4" />
                      Off
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => onRestore(record)}>
                      <ArchiveRestoreIcon className="size-4" />
                      Restore
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onDelete(record)}>
                    <Trash2Icon className="size-4" />
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusTone(status: string) {
  if (["completed", "done", "released", "approved"].includes(status)) return "green";
  if (["blocked", "critical", "needs-review"].includes(status)) return "red";
  return "blue";
}
