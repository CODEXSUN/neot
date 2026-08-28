import { Trash2 } from "lucide-react";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { WorkspaceProtectedIndicator } from "@neot/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@neot/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import { WorkspaceTable } from "@neot/ui/workspace/table";
import type { User } from "./user.types";

export function UserList({
  actorEmail,
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records,
  roleLabels
}: {
  actorEmail: string;
  loading: boolean;
  onEdit: (record: User) => void;
  onForceDelete: (record: User) => void;
  onRestore: (record: User) => void;
  onSuspend: (record: User) => void;
  records: User[];
  roleLabels: ReadonlyMap<string, string>;
}) {
  const columns: ColumnDef<User>[] = [
    {
      cell: ({ row }) => <div className="text-center tabular-nums">{row.index + 1}</div>,
      header: () => <div className="text-center">#</div>,
      id: "number",
      size: 64
    },
    {
      accessorKey: "name",
      cell: ({ row }) => (
        <RecordName actorEmail={actorEmail} record={row.original} onEdit={onEdit} />
      ),
      header: "User"
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={roleLabels.get(row.original.role) ?? row.original.role}
          tone="info"
        />
      ),
      header: "Role"
    },
    {
      accessorKey: "status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={statusLabel(row.original.status)}
          tone={
            row.original.status === "active"
              ? "success"
              : row.original.status === "suspended"
                ? "danger"
                : "neutral"
          }
        />
      ),
      header: "Status"
    },
    {
      cell: ({ row }) => (
        <Actions
          actorEmail={actorEmail}
          record={row.original}
          onEdit={onEdit}
          onForceDelete={onForceDelete}
          onRestore={onRestore}
          onSuspend={onSuspend}
        />
      ),
      enableSorting: false,
      header: () => <div className="text-center">Actions</div>,
      id: "actions",
      size: 96
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No users found."
      isLoading={loading}
      minWidth="1080px"
    />
  );
}
function RecordName({
  actorEmail,
  onEdit,
  record
}: {
  actorEmail: string;
  onEdit: (record: User) => void;
  record: User;
}) {
  return record.isProtected && record.email.toLowerCase() !== actorEmail.toLowerCase() ? (
    <span className="font-medium">{record.name}</span>
  ) : (
    <button
      className="cursor-pointer font-medium text-foreground hover:underline"
      onClick={() => onEdit(record)}
      type="button"
    >
      {record.name}
    </button>
  );
}
function Actions({
  actorEmail,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  record
}: {
  actorEmail: string;
  onEdit: (record: User) => void;
  onForceDelete: (record: User) => void;
  onRestore: (record: User) => void;
  onSuspend: (record: User) => void;
  record: User;
}) {
  return (
    <div
      className="flex w-full justify-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {record.isProtected && record.email.toLowerCase() !== actorEmail.toLowerCase() ? (
        <WorkspaceProtectedIndicator label="Protected user" />
      ) : record.isProtected ? (
        <WorkspaceRowActions onEdit={() => onEdit(record)} title={record.name} />
      ) : (
        <WorkspaceRowActions
          actions={[
            {
              id: "force-delete",
              icon: <Trash2 className="size-4" />,
              label: "Force delete",
              onSelect: () => onForceDelete(record),
              tone: "destructive"
            }
          ]}
          deleteLabel="Suspend"
          isSuspended={record.status !== "active"}
          onDelete={() => onSuspend(record)}
          onEdit={() => onEdit(record)}
          onRestore={() => onRestore(record)}
          title={record.name}
        />
      )}
    </div>
  );
}
function statusLabel(status: User["status"]) {
  return status === "active" ? "Active" : status === "suspended" ? "Suspended" : "Inactive";
}
