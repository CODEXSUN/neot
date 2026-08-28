import { CheckCircle2Icon, CircleIcon, Clock3Icon } from "lucide-react";
import { useEffect, useState } from "react";
import type { CodexStatus } from "./launch-desk.types";

type ConnectionRecord = {
  connected: boolean;
  email: string | null;
  planType: string | null;
  recordedAt: number;
};

const storageKey = "neot_codex_connection_history";

export function useCodexConnectionHistory(status?: CodexStatus, checkedAt?: number) {
  const [records, setRecords] = useState<ConnectionRecord[]>(readRecords);

  useEffect(() => {
    if (!status || !checkedAt) return;
    setRecords((current) => {
      const latest = current[0];
      const unchanged =
        latest?.connected === status.connected &&
        latest.email === status.email &&
        latest.planType === status.planType;
      if (unchanged) return current;
      const next = [
        {
          connected: status.connected,
          email: status.email,
          planType: status.planType,
          recordedAt: checkedAt
        },
        ...current
      ].slice(0, 20);
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [checkedAt, status]);

  return records;
}

export function CodexConnectionHistory({ records }: { records: ConnectionRecord[] }) {
  return (
    <section className="flex min-h-0 flex-1 flex-col px-6 py-5">
      <div className="flex items-end justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="font-semibold">Connection history</h2>
          <p className="pt-1 text-sm text-muted-foreground">Latest 20 status changes on this device</p>
        </div>
        <span className="text-sm text-muted-foreground">{records.length} events</span>
      </div>
      {records.length ? (
        <div className="divide-y overflow-y-auto">
          {records.map((record) => (
            <div className="flex items-center gap-4 py-4" key={record.recordedAt}>
              <span className={getStatusIconClass(record.connected)}>
                {record.connected ? (
                  <CheckCircle2Icon className="size-4" />
                ) : (
                  <CircleIcon className="size-3.5 fill-current" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{record.connected ? "Connected" : "Disconnected"}</p>
                <p className="truncate pt-0.5 text-sm text-muted-foreground">
                  {record.email ?? "Independent Codex runtime"}
                  {record.planType ? ` · ${record.planType}` : ""}
                </p>
              </div>
              <time className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                <Clock3Icon className="size-3.5" /> {formatTimestamp(record.recordedAt)}
              </time>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-10 text-sm text-muted-foreground">
          Connection changes will appear here after the first status check.
        </p>
      )}
    </section>
  );
}

function readRecords(): ConnectionRecord[] {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as ConnectionRecord[];
  } catch {
    return [];
  }
}

function getStatusIconClass(connected: boolean) {
  const color = connected
    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
    : "bg-muted text-muted-foreground";
  return `grid size-9 shrink-0 place-items-center rounded-full ${color}`;
}

function formatTimestamp(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(value));
}
