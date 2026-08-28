import { Trash2 } from "lucide-react";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { WorkspaceProtectedIndicator } from "@neot/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@neot/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import { WorkspaceTable } from "@neot/ui/workspace/table";
import type { UserRole } from "./user-role.types";
export function UserRoleList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: UserRole) => void;
  onForceDelete: (record: UserRole) => void;
  onRestore: (record: UserRole) => void;
  onSuspend: (record: UserRole) => void;
  records: UserRole[];
}) {
  const columns: ColumnDef<UserRole>[] = [
    {
      cell: ({ row }) => <div className="text-center tabular-nums">{row.index + 1}</div>,
      header: () => <div className="text-center">#</div>,
      id: "number",
      size: 64
    },
    {
      accessorKey: "userName",
      cell: ({ row }) =>
        row.original.isProtected ? (
          <span className="font-medium">{row.original.userName}</span>
        ) : (
          <button
            className="cursor-pointer font-medium text-foreground hover:underline"
            onClick={() => onEdit(row.original)}
            type="button"
          >
            {row.original.userName}
          </button>
        ),
      header: "User"
    },
    { accessorKey: "userEmail", header: "Email" },
    { accessorKey: "roleLabel", header: "Role" },
    {
      accessorKey: "status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status === "active" ? "Active" : "Inactive"}
          tone={row.original.status === "active" ? "success" : "neutral"}
        />
      ),
      header: "Status"
    },
    {
      cell: ({ row }) => (
        <Actions
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
      emptyState="No user roles found."
      isLoading={loading}
      minWidth="860px"
    />
  );
}
function Actions({
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  record
}: {
  onEdit: (record: UserRole) => void;
  onForceDelete: (record: UserRole) => void;
  onRestore: (record: UserRole) => void;
  onSuspend: (record: UserRole) => void;
  record: UserRole;
}) {
  return (
    <div
      className="flex w-full justify-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {record.isProtected ? (
        <WorkspaceProtectedIndicator label="Protected user role" />
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
          isSuspended={record.status === "inactive"}
          onDelete={() => onSuspend(record)}
          onEdit={() => onEdit(record)}
          onRestore={() => onRestore(record)}
          title={`${record.userName} · ${record.roleLabel}`}
        />
      )}
    </div>
  );
}
