import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import { listTodos } from "../task-manager/task-manager.services";
import type { Todo } from "../task-manager/task-manager.types";
import { WorkShell } from "./work-navigation";

const filters = ["All", "Today", "Upcoming", "Overdue", "Assigned", "Watching"] as const;
type Filter = (typeof filters)[number];

export function MyWorkWorkspace() {
  const todosQuery = useQuery({
    queryFn: listTodos,
    queryKey: ["task-manager", "todos"],
    refetchOnWindowFocus: true
  });
  const projectsQuery = useProjectManagerRecordsQuery("project");
  const [filter, setFilter] = useState<Filter>("All");
  const todos = useMemo(
    () => filterTodos(todosQuery.data ?? [], filter),
    [filter, todosQuery.data]
  );
  const recent = [...(todosQuery.data ?? [])]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <WorkShell current="My Work">
      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your personal command center</h1>
            <p className="pt-2 text-sm text-muted-foreground">
              Live tasks assigned to this local NEOT workspace.
            </p>
          </div>
          <nav aria-label="My Work filters" className="flex flex-wrap gap-1">
            {filters.map((item) => (
              <button
                aria-pressed={filter === item}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${filter === item ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted"}`}
                key={item}
                onClick={() => setFilter(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        {todosQuery.isLoading ? (
          <p className="py-10 text-sm text-muted-foreground">Loading…</p>
        ) : null}
        {todosQuery.error ? (
          <p className="py-10 text-sm text-destructive">{todosQuery.error.message}</p>
        ) : null}
        {!todosQuery.isLoading && !todosQuery.error ? (
          <WorkList projects={projectsQuery.data ?? []} todos={todos} title={filter} />
        ) : null}

        <section className="border-t py-7">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Recently worked on
          </h2>
          {!recent.length ? (
            <p className="pt-4 text-sm text-muted-foreground">No recent work yet.</p>
          ) : null}
          <div className="divide-y pt-3">
            {recent.map((todo) => (
              <a
                className="flex items-center gap-3 py-4 hover:text-primary"
                href={`/app/neot/tasks?task=${encodeURIComponent(todo.id)}`}
                key={todo.id}
              >
                <span className="font-mono text-sm text-muted-foreground">{shortId(todo.id)}</span>
                <strong>{todo.title}</strong>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(todo.updatedAt)}
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>
    </WorkShell>
  );
}

function WorkList({
  projects,
  todos,
  title
}: {
  projects: Array<{ id: string; title: string; repositoryUrl: string }>;
  todos: Todo[];
  title: string;
}) {
  return (
    <section className="py-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {title}
        </h2>
        <span className="text-sm text-muted-foreground">
          {todos.length} {todos.length === 1 ? "task" : "tasks"}
        </span>
      </div>
      {!todos.length ? (
        <p className="py-10 text-sm text-muted-foreground">No work matches this filter.</p>
      ) : null}
      <div className="divide-y pt-3">
        {todos.map((todo) => {
          const project = projects.find(
            (item) => item.id === todo.groupName || item.title === todo.groupName
          );
          return (
            <article className="py-5" key={todo.id}>
              <div className="flex flex-wrap items-baseline gap-3">
                <a
                  className="font-mono text-sm font-semibold text-primary"
                  href={`/app/neot/tasks?task=${encodeURIComponent(todo.id)}`}
                >
                  {shortId(todo.id)}
                </a>
                <h3 className="text-base font-semibold">{todo.title}</h3>
              </div>
              <p className="pt-2 text-sm text-muted-foreground">
                {todo.priority || "No priority"} · {todo.status || "Open"} ·{" "}
                {todo.groupName || "No project"}
                {todo.dueDate ? ` · due ${formatDate(todo.dueDate)}` : ""}
              </p>
              <nav
                aria-label={`${todo.title} resources`}
                className="flex flex-wrap gap-x-4 gap-y-2 pt-4"
              >
                <a
                  className="text-xs font-medium text-primary hover:underline"
                  href={`/app/neot/tasks?task=${encodeURIComponent(todo.id)}`}
                >
                  Open task →
                </a>
                {project?.repositoryUrl ? (
                  <a
                    className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
                    href={project.repositoryUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Repository ↗
                  </a>
                ) : null}
              </nav>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function filterTodos(todos: Todo[], filter: Filter) {
  const today = new Date().toISOString().slice(0, 10);
  const open = todos.filter((todo) => !["completed", "done"].includes(todo.status.toLowerCase()));
  if (filter === "Today") return open.filter((todo) => todo.dueDate === today);
  if (filter === "Upcoming") return open.filter((todo) => todo.dueDate > today);
  if (filter === "Overdue") return open.filter((todo) => todo.dueDate && todo.dueDate < today);
  if (filter === "Assigned") return open.filter((todo) => todo.status.toLowerCase() === "assigned");
  if (filter === "Watching")
    return open.filter((todo) => todo.category.toLowerCase() === "watching");
  return open;
}

function shortId(id: string) {
  return id.length > 12 ? id.slice(0, 8).toUpperCase() : id;
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`)
  );
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}
