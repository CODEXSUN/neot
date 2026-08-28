import { Card, CardContent, WorkspaceStatusBadge } from "@neot/ui";
import { CloudConnectionPanel, LocalConnectionPanel } from "./sync.connection-panels";
import { useSyncStatus } from "./sync.hooks";

export function SyncOverview() {
  const status = useSyncStatus();
  const sync = status.data;

  if (sync?.role === "disabled") return null;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Cloud connection</h2>
              <WorkspaceStatusBadge
                label={status.isPending ? "Checking" : statusLabel(sync?.status)}
                tone={
                  sync?.status === "bound"
                    ? "success"
                    : sync?.status === "error" || sync?.status === "conflict"
                      ? "danger"
                      : "warning"
                }
              />
            </div>
            <p className="pt-1 text-sm text-muted-foreground">
              {sync?.cloudUrl ?? "https://neot.in"}
              {sync?.bound
                ? ` · ${sync.instanceId} · Revision ${sync.remoteRevision}`
                : " · Not connected"}
            </p>
          </div>
          {sync?.pendingRecords !== undefined ? (
            <p className="text-sm text-muted-foreground">
              {sync.pendingRecords} local changes pending
            </p>
          ) : null}
        </div>

        {sync?.lastError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {sync.lastError}
          </p>
        ) : null}
        {sync?.role === "cloud" ? <CloudConnectionPanel /> : null}
        {sync?.role === "local" ? <LocalConnectionPanel sync={sync} /> : null}
      </CardContent>
    </Card>
  );
}

function statusLabel(status: string | undefined) {
  if (!status) return "Loading";
  if (status === "bound") return "Connected";
  if (status === "unbound") return "Not connected";
  return status[0]?.toUpperCase() + status.slice(1);
}
