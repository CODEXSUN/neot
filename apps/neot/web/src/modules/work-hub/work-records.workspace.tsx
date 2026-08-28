import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  PencilIcon,
  PlusIcon,
  RocketIcon
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@neot/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@neot/ui/components/dialog";
import { Input } from "@neot/ui/components/input";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import { WorkspaceLookup } from "@neot/ui/workspace/lookup";
import {
  useProjectManagerMutations,
  useProjectManagerRecordsQuery
} from "../project-manager/project-manager.hooks";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import { WorkShell } from "./work-navigation";

type WorkSection = "Issues" | "Releases" | "Sprints";
type RecordDraft = {
  assignee: string;
  description: string;
  dueDate: string;
  id: string;
  priority: ProjectManagerRecord["priority"];
  referenceId: string;
  startDate: string;
  status: string;
  title: string;
};

const configurations = {
  Issues: {
    description: "Track blockers, defects, and delivery concerns through resolution.",
    kind: "issue" as const,
    prefix: "ISS",
    statuses: ["open", "in-progress", "blocked", "completed"]
  },
  Releases: {
    description: "Plan versions, target dates, ownership, and delivery state.",
    kind: "release" as const,
    prefix: "REL",
    statuses: ["planned", "in-progress", "ready", "released"]
  },
  Sprints: {
    description: "Organize time-boxed delivery commitments and sprint outcomes.",
    kind: "timeline" as const,
    prefix: "SPR",
    statuses: ["planned", "active", "completed"]
  }
};

export function WorkRecordsWorkspace({ section }: { section: WorkSection }) {
  const config = configurations[section];
  const recordsQuery = useProjectManagerRecordsQuery(config.kind);
  const projectsQuery = useProjectManagerRecordsQuery("project");
  const mutations = useProjectManagerMutations(config.kind);
  const [editing, setEditing] = useState<RecordDraft | null>(null);
  const [projectId, setProjectId] = useState("all");
  const [selectedId, setSelectedId] = useState(() => routeRecordId(section));
  const records = useMemo(
    () =>
      (recordsQuery.data ?? [])
        .filter((record) => record.active && (section !== "Sprints" || record.type === "sprint"))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [recordsQuery.data, section]
  );
  const visibleRecords = records.filter(
    (record) => projectId === "all" || record.referenceId === projectId
  );
  const groupedRecords = groupByProject(visibleRecords, projectsQuery.data ?? []);
  const selectedRecord = records.find((record) => record.id === selectedId) ?? null;
  const save = async () => {
    if (!editing?.title.trim()) return;
    const payload = {
      assignee: editing.assignee.trim(),
      description: editing.description.trim(),
      dueDate: editing.dueDate,
      key: editing.id
        ? records.find((record) => record.id === editing.id)?.key
        : recordKey(config.prefix),
      moduleKey: "project-manager",
      priority: editing.priority,
      referenceId: editing.referenceId,
      referenceType: editing.referenceId ? "project" : "",
      startDate: editing.startDate,
      status: editing.status,
      title: editing.title.trim(),
      type: section === "Sprints" ? "sprint" : section.toLowerCase().slice(0, -1)
    };
    try {
      if (editing.id) await mutations.update.mutateAsync({ id: editing.id, payload });
      else await mutations.create.mutateAsync(payload);
      toast.success(`${section.slice(0, -1)} saved`);
      setEditing(null);
    } catch (error) {
      toast.error(`${section.slice(0, -1)} could not be saved`, {
        description: error instanceof Error ? error.message : "Please try again."
      });
    }
  };

  if (selectedRecord && section !== "Issues") {
    return (
      <WorkRecordDetail
        onBack={() => {
          window.history.pushState({}, "", `/app/neot/${section.toLowerCase()}`);
          setSelectedId("");
        }}
        onEdit={() => setEditing(fromRecord(selectedRecord))}
        project={projectFor(selectedRecord, projectsQuery.data ?? [])}
        record={selectedRecord}
        section={section}
      >
        <RecordDialog
          config={config}
          draft={editing}
          onChange={setEditing}
          onSave={() => void save()}
          projects={projectsQuery.data ?? []}
          section={section}
        />
      </WorkRecordDetail>
    );
  }

  return (
    <WorkShell current={section}>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{section}</h1>
            <p className="pt-2 text-base text-muted-foreground">{config.description}</p>
          </div>
          <Button
            onClick={() =>
              setEditing(emptyDraft(config.statuses[0]!, projectId === "all" ? "" : projectId))
            }
          >
            <PlusIcon /> New {section.slice(0, -1).toLowerCase()}
          </Button>
        </header>

        <section className="border-b py-5">
          <label className="grid max-w-xl gap-2 text-sm font-medium">
            Project context
            <WorkspaceLookup
              createMode="none"
              options={projectLookupOptions(projectsQuery.data ?? [], true)}
              placeholder="Search or select a project"
              value={projectId}
              onValueChange={(value) => setProjectId(value || "all")}
            />
          </label>
          <p className="pt-2 text-sm text-muted-foreground">
            Select one project or keep All projects to review grouped work in a single page.
          </p>
        </section>

        {recordsQuery.isLoading ? (
          <p className="py-10 text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {recordsQuery.error ? (
          <p className="py-10 text-sm text-destructive">{recordsQuery.error.message}</p>
        ) : null}
        {!recordsQuery.isLoading && !recordsQuery.error && !visibleRecords.length ? (
          <section className="py-14 text-center">
            <CalendarDaysIcon className="mx-auto size-8 text-muted-foreground" />
            <h2 className="pt-4 font-semibold">No {section.toLowerCase()} yet</h2>
            <p className="pt-1 text-sm text-muted-foreground">
              Create the first record to begin this workflow.
            </p>
          </section>
        ) : null}
        {groupedRecords.map((group) => (
          <section
            className="border-b py-6"
            aria-label={`${group.title} ${section}`}
            key={group.id}
          >
            <div className="flex items-center justify-between gap-4 pb-2">
              <div>
                <p className="font-semibold">{group.title}</p>
                <p className="text-xs text-muted-foreground">{group.key}</p>
              </div>
              <span className="text-sm text-muted-foreground">{group.records.length} records</span>
            </div>
            {section === "Issues" ? (
              <div className="divide-y">
                {group.records.map((record) => (
                  <article className="flex items-center gap-4 py-5" key={record.id}>
                    <div className="w-28 shrink-0 font-mono text-sm text-muted-foreground">
                      {record.key}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold">{record.title}</h2>
                        <WorkspaceStatusBadge
                          label={label(record.status)}
                          tone={tone(record.status)}
                        />
                      </div>
                      <p className="truncate pt-1 text-sm text-muted-foreground">
                        {projectName(record, projectsQuery.data ?? [])} ·{" "}
                        {record.assignee || "Unassigned"}
                        {record.dueDate ? ` · ${formatDate(record.dueDate)}` : ""}
                      </p>
                    </div>
                    <Button
                      aria-label={`Edit ${record.title}`}
                      onClick={() => setEditing(fromRecord(record))}
                      size="icon"
                      variant="ghost"
                    >
                      <PencilIcon />
                    </Button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {group.records.map((record) => (
                  <button
                    className="group flex min-h-44 cursor-pointer flex-col rounded-xl border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    key={record.id}
                    onClick={() => {
                      const parameter = section === "Sprints" ? "sprint" : "release";
                      window.history.pushState(
                        { id: record.id, page: parameter },
                        "",
                        `/app/neot/${section.toLowerCase()}?${parameter}=${encodeURIComponent(record.id)}`
                      );
                      setSelectedId(record.id);
                    }}
                    type="button"
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {section === "Sprints" ? (
                          <CalendarDaysIcon className="size-4" />
                        ) : (
                          <RocketIcon className="size-4" />
                        )}
                      </span>
                      <WorkspaceStatusBadge
                        label={label(record.status)}
                        tone={tone(record.status)}
                      />
                    </div>
                    <p className="pt-4 font-mono text-xs text-muted-foreground">{record.key}</p>
                    <h3 className="pt-1 font-semibold group-hover:text-primary">{record.title}</h3>
                    <div className="mt-auto flex w-full items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
                      <span>{record.dueDate ? formatDate(record.dueDate) : "No target date"}</span>
                      <ArrowRightIcon className="size-4 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </main>

      <RecordDialog
        config={config}
        draft={editing}
        onChange={setEditing}
        onSave={() => void save()}
        projects={projectsQuery.data ?? []}
        section={section}
      />
    </WorkShell>
  );
}

function RecordDialog({
  config,
  draft,
  onChange,
  onSave,
  projects,
  section
}: {
  config: (typeof configurations)[WorkSection];
  draft: RecordDraft | null;
  onChange: (draft: RecordDraft | null) => void;
  onSave: () => void;
  projects: ProjectManagerRecord[];
  section: WorkSection;
}) {
  if (!draft) return null;
  const update = <Key extends keyof RecordDraft>(key: Key, value: RecordDraft[Key]) =>
    onChange({ ...draft, [key]: value });
  return (
    <Dialog open onOpenChange={(open) => !open && onChange(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {draft.id ? "Edit" : "New"} {section.slice(0, -1).toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Save this record to the shared project delivery workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            Title
            <Input
              autoFocus
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Status
            <select
              className="h-9 rounded-md border bg-background px-3"
              value={draft.status}
              onChange={(event) => update("status", event.target.value)}
            >
              {config.statuses.map((status) => (
                <option key={status} value={status}>
                  {label(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Priority
            <select
              className="h-9 rounded-md border bg-background px-3"
              value={draft.priority}
              onChange={(event) =>
                update("priority", event.target.value as RecordDraft["priority"])
              }
            >
              {["low", "medium", "high", "critical"].map((priority) => (
                <option key={priority} value={priority}>
                  {label(priority)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Project
            <select
              className="h-9 rounded-md border bg-background px-3"
              value={draft.referenceId}
              onChange={(event) => update("referenceId", event.target.value)}
            >
              <option value="">No project</option>
              {projects
                .filter((project) => project.active)
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Owner
            <Input
              value={draft.assignee}
              onChange={(event) => update("assignee", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Start date
            <Input
              type="date"
              value={draft.startDate}
              onChange={(event) => update("startDate", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Target date
            <Input
              type="date"
              value={draft.dueDate}
              onChange={(event) => update("dueDate", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm sm:col-span-2">
            Description
            <textarea
              className="min-h-28 rounded-md border bg-background px-3 py-2"
              value={draft.description}
              onChange={(event) => update("description", event.target.value)}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={() => onChange(null)} variant="outline">
            Cancel
          </Button>
          <Button disabled={!draft.title.trim()} onClick={onSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkRecordDetail({
  children,
  onBack,
  onEdit,
  project,
  record,
  section
}: {
  children: ReactNode;
  onBack: () => void;
  onEdit: () => void;
  project: ProjectManagerRecord | null;
  record: ProjectManagerRecord;
  section: Exclude<WorkSection, "Issues">;
}) {
  return (
    <WorkShell current={section}>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-5">
          <Button onClick={onBack} variant="ghost">
            <ArrowLeftIcon /> All {section.toLowerCase()}
          </Button>
          <Button onClick={onEdit} variant="outline">
            <PencilIcon /> Edit
          </Button>
        </div>
        <header className="py-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{record.key}</span>
            <WorkspaceStatusBadge label={label(record.status)} tone={tone(record.status)} />
          </div>
          <h1 className="pt-3 text-3xl font-semibold tracking-tight">{record.title}</h1>
          <p className="pt-2 text-sm text-muted-foreground">
            {project?.title ?? "Unassigned project"} · {record.assignee || "Unassigned owner"}
          </p>
        </header>
        <section className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <DetailCell label="Project" value={project?.title ?? "Not connected"} />
          <DetailCell label="Status" value={label(record.status)} />
          <DetailCell
            label="Start"
            value={record.startDate ? formatDate(record.startDate) : "Not set"}
          />
          <DetailCell
            label="Target"
            value={record.dueDate ? formatDate(record.dueDate) : "Not set"}
          />
        </section>
        <section className="border-b py-8">
          <h2 className="font-semibold">Description</h2>
          <p className="max-w-3xl whitespace-pre-wrap pt-3 text-sm leading-6 text-muted-foreground">
            {record.description ||
              `No ${section.slice(0, -1).toLowerCase()} description has been added.`}
          </p>
        </section>
      </main>
      {children}
    </WorkShell>
  );
}

function DetailCell({ label: cellLabel, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {cellLabel}
      </p>
      <p className="pt-2 font-medium">{value}</p>
    </div>
  );
}

function emptyDraft(status: string, projectId = ""): RecordDraft {
  return {
    assignee: "",
    description: "",
    dueDate: "",
    id: "",
    priority: "medium",
    referenceId: projectId,
    startDate: "",
    status,
    title: ""
  };
}

function fromRecord(record: ProjectManagerRecord): RecordDraft {
  return {
    assignee: record.assignee,
    description: record.description,
    dueDate: record.dueDate,
    id: record.id,
    priority: record.priority,
    referenceId: record.referenceType === "project" ? record.referenceId : "",
    startDate: record.startDate,
    status: record.status,
    title: record.title
  };
}

function recordKey(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
function label(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function tone(status: string): "danger" | "info" | "neutral" | "success" | "warning" {
  if (["blocked"].includes(status)) return "danger";
  if (["completed", "released"].includes(status)) return "success";
  if (["active", "in-progress", "ready"].includes(status)) return "info";
  if (["planned", "open"].includes(status)) return "warning";
  return "neutral";
}
function projectName(record: ProjectManagerRecord, projects: ProjectManagerRecord[]) {
  return projects.find((project) => project.id === record.referenceId)?.title ?? "No project";
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function routeRecordId(section: WorkSection) {
  if (section === "Issues") return "";
  return (
    new URLSearchParams(window.location.search).get(section === "Sprints" ? "sprint" : "release") ??
    ""
  );
}

function projectFor(record: ProjectManagerRecord, projects: ProjectManagerRecord[]) {
  return (
    projects.find(
      (project) => project.id === record.referenceId || project.key === record.referenceId
    ) ?? null
  );
}

function projectLookupOptions(projects: ProjectManagerRecord[], includeAll = false) {
  return [
    ...(includeAll ? [{ label: "All projects", value: "all" }] : []),
    ...projects
      .filter((project) => project.active)
      .map((project) => ({
        description: project.key,
        label: project.title,
        value: project.id
      }))
  ];
}

function groupByProject(records: ProjectManagerRecord[], projects: ProjectManagerRecord[]) {
  const groups = new Map<
    string,
    { id: string; key: string; records: ProjectManagerRecord[]; title: string }
  >();
  for (const record of records) {
    const project = projects.find((item) => item.id === record.referenceId);
    const id = project?.id ?? "unassigned";
    const group = groups.get(id) ?? {
      id,
      key: project?.key ?? "NO-PROJECT",
      records: [],
      title: project?.title ?? "Unassigned project"
    };
    group.records.push(record);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
}
