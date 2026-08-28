import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleGaugeIcon,
  FolderKanbanIcon
} from "lucide-react";
import { GlobalLoader } from "@neot/ui/components/global-loader";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import { useProjectManagerRecordsQuery } from "./project-manager.hooks";
import type { ProjectManagerRecord } from "./project-manager.types";
import { SyncOverview } from "../sync";

export function ProjectManagerOverview({
  onOpenProject
}: {
  onOpenProject: (projectId: string) => void;
}) {
  const projectsQuery = useProjectManagerRecordsQuery("project");
  const projects = projectsQuery.data ?? [];
  const activeProjects = projects.filter((project) => project.active);
  const completedProjects = activeProjects.filter((project) =>
    ["approved", "completed", "released"].includes(project.status)
  );
  const atRiskProjects = activeProjects.filter((project) =>
    ["blocked", "on-hold"].includes(project.status)
  );
  const recentProjects = activeProjects.slice(0, 4);

  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-3 py-4 lg:w-[calc(100%-3rem)]">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-md border bg-card px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Developer workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold">NEOT</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects, delivery status, planning, and developer operations in one view.
          </p>
        </div>
        <WorkspaceStatusBadge
          label={`${activeProjects.length} active`}
          tone={atRiskProjects.length ? "warning" : "success"}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric icon={FolderKanbanIcon} label="All projects" value={projects.length} />
        <OverviewMetric icon={CircleGaugeIcon} label="Active" value={activeProjects.length} />
        <OverviewMetric icon={AlertTriangleIcon} label="At risk" value={atRiskProjects.length} />
        <OverviewMetric
          icon={CheckCircle2Icon}
          label="Completed"
          value={completedProjects.length}
        />
      </section>

      <SyncOverview />

      <section className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Recent projects</h2>
            <p className="text-sm text-muted-foreground">
              Open a project to continue its delivery timeline.
            </p>
          </div>
          <WorkspaceStatusBadge
            label={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
            tone="info"
          />
        </div>

        {projectsQuery.isLoading ? (
          <div className="py-8">
            <GlobalLoader className="min-h-20" fullScreen={false} />
          </div>
        ) : null}
        {projectsQuery.error ? (
          <div className="rounded-md border border-destructive/40 bg-card p-4 text-sm text-destructive">
            {projectsQuery.error.message}
          </div>
        ) : null}
        {!projectsQuery.isLoading && !projectsQuery.error && !projects.length ? (
          <div className="rounded-md border bg-card p-8 text-center">
            <FolderKanbanIcon className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create the first project from the Projects workspace.
            </p>
          </div>
        ) : null}
        {recentProjects.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {recentProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => onOpenProject(project.id)}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof FolderKanbanIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-4 shadow-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-foreground">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function ProjectCard({ onOpen, project }: { onOpen: () => void; project: ProjectManagerRecord }) {
  return (
    <button
      className="group rounded-md border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      type="button"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <FolderKanbanIcon className="size-4" />
        </span>
        <WorkspaceStatusBadge
          label={project.active ? label(project.status) : "Inactive"}
          tone={project.active ? statusTone(project.status) : "neutral"}
        />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{project.key}</p>
          <h3 className="mt-0.5 font-semibold group-hover:text-primary">{project.title}</h3>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
        <span>{project.assignee || "Owner not assigned"}</span>
        <span>{formatDate(project.dueDate)}</span>
      </div>
    </button>
  );
}

function statusTone(status: string): "danger" | "info" | "success" | "warning" {
  if (["approved", "completed", "released"].includes(status)) return "success";
  if (["blocked", "on-hold"].includes(status)) return "danger";
  if (status === "in-progress") return "info";
  return "warning";
}

function label(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  if (!value) return "No target date";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(date);
}
