import {
  CalendarRangeIcon,
  CircleDotIcon,
  ClipboardCheckIcon,
  GitPullRequestArrowIcon,
  ListChecksIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import { listTodos } from "../task-manager/task-manager.services";
import { WorkRecordsWorkspace } from "./work-records.workspace";
import { WorkShell } from "./work-navigation";

const destinations = [
  { icon: ClipboardCheckIcon, title: "My Work", url: "/app/neot/my-work" },
  { icon: ListChecksIcon, title: "Tasks", url: "/app/neot/tasks" },
  { icon: CircleDotIcon, title: "Issues", url: "/app/neot/issues" },
  { icon: CalendarRangeIcon, title: "Sprints", url: "/app/neot/sprints" },
  { icon: GitPullRequestArrowIcon, title: "Releases", url: "/app/neot/releases" }
] as const;

export function WorkOverviewWorkspace() {
  const todos = useQuery({ queryFn: listTodos, queryKey: ["task-manager", "todos"] });
  const issues = useProjectManagerRecordsQuery("issue");
  const releases = useProjectManagerRecordsQuery("release");
  const timelines = useProjectManagerRecordsQuery("timeline");
  const activeTodos = (todos.data ?? []).filter((item) => !isDone(item.status));
  const activeIssues = (issues.data ?? []).filter((item) => item.active && !isDone(item.status));
  const activeReleases = (releases.data ?? []).filter(
    (item) => item.active && !isDone(item.status)
  );
  const activeSprints = (timelines.data ?? []).filter(
    (item) => item.active && item.type === "sprint" && !isDone(item.status)
  );
  const summaries = [
    summary("My Work", activeTodos.length, dueContext(activeTodos), "/app/neot/my-work"),
    summary("Tasks", activeTodos.length, statusContext(activeTodos), "/app/neot/tasks"),
    summary("Issues", activeIssues.length, priorityContext(activeIssues), "/app/neot/issues"),
    summary("Sprints", activeSprints.length, sprintContext(activeSprints), "/app/neot/sprints"),
    summary("Releases", activeReleases.length, releaseContext(activeReleases), "/app/neot/releases")
  ];

  return (
    <WorkShell current="Overview">
      <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
        <header className="border-b pb-7">
          <h1 className="text-3xl font-semibold tracking-tight">
            Everything happening across your engineering work.
          </h1>
          <p className="max-w-2xl pt-2 text-base leading-7 text-muted-foreground">
            Live projects, tasks, modules, and releases from the NEOT workspace.
          </p>
          <nav aria-label="Work sections" className="flex flex-wrap gap-2 pt-6">
            {destinations.map((item) => (
              <a
                className="rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href={item.url}
                key={item.title}
              >
                {item.title}
              </a>
            ))}
          </nav>
        </header>

        <section className="grid gap-4 py-7 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((item) => (
            <a
              className="group flex min-h-40 flex-col justify-between rounded-xl border bg-card p-5 transition-transform hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              href={item.url}
              key={item.title}
            >
              <span>
                <strong className="block text-lg font-semibold group-hover:text-primary">
                  {item.title}
                </strong>
                <strong className="block pt-4 text-3xl font-semibold tracking-tight">
                  {item.value}
                </strong>
                <span className="block pt-2 text-sm text-muted-foreground">{item.context}</span>
              </span>
              <span className="text-sm font-medium text-primary">View →</span>
            </a>
          ))}
        </section>
      </main>
    </WorkShell>
  );
}

export function WorkSectionWorkspace({ section }: { section: "Issues" | "Releases" | "Sprints" }) {
  return <WorkRecordsWorkspace section={section} />;
}

function summary(title: string, value: number, context: string, url: string) {
  return { context, title, url, value };
}

function isDone(status: string) {
  return ["approved", "completed", "done", "released"].includes(status.toLowerCase());
}

function dueContext(items: Array<{ dueDate: string }>) {
  const today = new Date().toISOString().slice(0, 10);
  const dueToday = items.filter((item) => item.dueDate === today).length;
  return dueToday ? `${dueToday} due today` : "No work due today";
}

function statusContext(items: Array<{ status: string }>) {
  const progressing = items.filter((item) => item.status.toLowerCase().includes("progress")).length;
  return progressing ? `${progressing} in progress` : "Ready to be scheduled";
}

function priorityContext(items: Array<{ priority: string }>) {
  const urgent = items.filter((item) => ["critical", "high"].includes(item.priority)).length;
  return urgent ? `${urgent} high priority` : "No high-priority issues";
}

function releaseContext(items: Array<{ dueDate: string }>) {
  const next = [...items]
    .filter((item) => item.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  return next ? `Next target ${formatDate(next.dueDate)}` : "No target date set";
}

function sprintContext(items: Array<{ status: string }>) {
  const active = items.filter((item) => item.status === "active").length;
  return active ? `${active} currently active` : "No active sprint";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(
    new Date(`${value}T00:00:00`)
  );
}
