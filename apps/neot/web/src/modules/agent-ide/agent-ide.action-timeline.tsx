import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
  Code2Icon,
  FileCode2Icon,
  GitBranchIcon,
  SearchIcon,
  SparklesIcon,
  TerminalSquareIcon,
  WrenchIcon,
  XCircleIcon
} from "lucide-react";
import { useState } from "react";
import type { AgentIdeChatAction } from "./agent-ide.types";

export function AgentIdeActionTimeline({
  actions,
  running
}: {
  actions: AgentIdeChatAction[];
  running: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!actions.length) return null;
  const visible = expanded ? actions : actions.slice(-5);
  const hiddenCount = actions.length - visible.length;
  const commandCount = actions.filter((action) => action.type === "command").length;
  return (
    <section className="mt-4 text-xs" aria-label="Agent actions">
      <header className="flex items-center gap-2 py-1 text-foreground">
        {running ? (
          <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
        ) : (
          <CheckCircle2Icon className="size-4" />
        )}
        <span className="font-semibold">{running ? "Agent working" : "Work completed"}</span>
        <span className="text-muted-foreground">
          {actions.length} action{actions.length === 1 ? "" : "s"}
          {commandCount ? ` · ${commandCount} command${commandCount === 1 ? "" : "s"}` : ""}
        </span>
      </header>
      <div className="ml-[7px] border-l border-dashed border-border pl-4 pt-1">
        {hiddenCount > 0 ? (
          <button
            className="mb-1 flex items-center gap-1 py-1 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(true)}
            type="button"
          >
            Show {hiddenCount} earlier action{hiddenCount === 1 ? "" : "s"}
            <ChevronDownIcon className="size-3.5" />
          </button>
        ) : null}
        <div className="grid gap-0.5">
          {visible.map((action) => (
            <ActionRow action={action} key={action.id} />
          ))}
        </div>
        {expanded && actions.length > 5 ? (
          <button
            className="mt-1 flex items-center gap-1 py-1 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(false)}
            type="button"
          >
            Show recent actions <ChevronUpIcon className="size-3.5" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ActionRow({ action }: { action: AgentIdeChatAction }) {
  return (
    <div className="group/action flex min-w-0 items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60">
      <span className="grid size-5 shrink-0 place-items-center text-muted-foreground">
        <ActionIcon type={action.type} />
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-foreground/85" title={action.label}>
        {action.label}
      </span>
      <span className={statusClass(action.status)}>{statusLabel(action.status)}</span>
    </div>
  );
}

function ActionIcon({ type }: { type: AgentIdeChatAction["type"] }) {
  if (type === "command") return <TerminalSquareIcon className="size-3.5" />;
  if (type === "compaction") return <SparklesIcon className="size-3.5" />;
  if (type === "file") return <FileCode2Icon className="size-3.5" />;
  if (type === "search") return <SearchIcon className="size-3.5" />;
  if (type === "subagent") return <GitBranchIcon className="size-3.5" />;
  if (type === "tool") return <WrenchIcon className="size-3.5" />;
  return <Code2Icon className="size-3.5" />;
}

function statusClass(status: AgentIdeChatAction["status"]) {
  const base = "flex w-20 shrink-0 items-center justify-end gap-1 text-[11px]";
  if (status === "failed") return `${base} text-destructive`;
  return `${base} text-muted-foreground`;
}

function statusLabel(status: AgentIdeChatAction["status"]) {
  if (status === "running") return "in progress";
  if (status === "failed") return (
    <>
      <XCircleIcon className="size-3" /> failed
    </>
  );
  return "completed";
}
