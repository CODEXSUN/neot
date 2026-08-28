import { WorkspaceStatusBadge } from "@neot/ui";
import {
  BotIcon,
  CloudIcon,
  DatabaseIcon,
  FileTextIcon,
  HardDriveIcon,
  ShieldCheckIcon
} from "lucide-react";
import { SyncOverview } from "./sync.overview";
import { useSyncStatus } from "./sync.hooks";

export function ProjectSyncSettingsWorkspace() {
  const status = useSyncStatus();
  const sync = status.data;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">Local-first hybrid sync</h1>
            <WorkspaceStatusBadge
              label={connectionLabel(sync)}
              tone={sync?.status === "bound" || sync?.role === "cloud" ? "success" : "warning"}
            />
          </div>
          <p className="max-w-3xl pt-2 text-sm leading-6 text-muted-foreground">
            Development stays on this computer. NEOT Cloud synchronizes approved work data,
            documents, planning records, and attachments in both directions.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
          <BotIcon className="size-3.5" /> OpenAI default
        </div>
      </header>

      <section className="grid gap-3 py-6 sm:grid-cols-2 lg:grid-cols-4">
        <Boundary
          icon={HardDriveIcon}
          label="Local execution"
          text="Repositories, Docker, worktrees, builds, tests, and Agent execution stay local."
        />
        <Boundary
          icon={DatabaseIcon}
          label="Work data"
          text="Projects, tasks, planning boards, activity, and registry records synchronize."
        />
        <Boundary
          icon={FileTextIcon}
          label="Documents"
          text="Registry documentation and project attachments synchronize with checksums."
        />
        <Boundary
          icon={CloudIcon}
          label="Cloud control"
          text="The cloud stores revisions, approvals, metadata, and synchronized snapshots."
        />
      </section>

      <SyncOverview />

      <section className="grid gap-3 pt-6 md:grid-cols-2">
        <Policy
          title="Two-way safety"
          text="Publish sends a new revision. Pull validates its checksum and stops when pending local changes could be overwritten."
        />
        <Policy
          title="Private by default"
          text="Provider secrets remain encrypted and server-side. Source repositories, environment files, Docker images, and local model files do not sync."
        />
      </section>
    </main>
  );
}

export function ProjectSyncButton() {
  const status = useSyncStatus();
  return (
    <a
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
      href="/app/neot/project-sync"
    >
      <CloudIcon className="size-4" />
      {status.data?.status === "bound" ? "Open sync" : "Connect cloud"}
    </a>
  );
}

function connectionLabel(sync: ReturnType<typeof useSyncStatus>["data"]) {
  if (sync?.role === "cloud") return "Cloud endpoint";
  if (sync?.status === "bound") return "Cloud connected";
  if (sync?.status === "error" || sync?.status === "conflict") return "Needs attention";
  return "Local only";
}

function Boundary({
  icon: Icon,
  label,
  text
}: {
  icon: typeof CloudIcon;
  label: string;
  text: string;
}) {
  return (
    <article className="rounded-xl border p-4">
      <Icon className="size-5 text-primary" />
      <h2 className="pt-4 font-semibold">{label}</h2>
      <p className="pt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </article>
  );
}

function Policy({ text, title }: { text: string; title: string }) {
  return (
    <article className="flex gap-3 border-t pt-4">
      <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="pt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </article>
  );
}
