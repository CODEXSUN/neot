import { Button } from "@neot/ui/components/button";
import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  MessageSquareTextIcon,
  PanelLeftCloseIcon,
  ShieldCheckIcon
} from "lucide-react";
import { useState } from "react";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import type {
  AgentIdeAccess,
  AgentIdeChatHistory as AgentIdeChatHistoryRecord,
  AgentIdeModel
} from "./agent-ide.types";

export function AgentIdeChatHistory({
  conversationId,
  histories,
  onClose,
  onOpenHistory
}: {
  conversationId: string | null;
  histories: AgentIdeChatHistoryRecord[];
  onClose: () => void;
  onOpenHistory: (uuid: string) => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-r bg-background p-4 [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1 lg:block">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <MessageSquareTextIcon className="size-4" /> Chat history
        </div>
        <Button
          aria-label="Hide chat history"
          onClick={onClose}
          size="icon"
          title="Hide chat history"
          variant="ghost"
        >
          <PanelLeftCloseIcon />
        </Button>
      </div>
      <div className="grid gap-1 pt-4">
        {histories.slice(0, 20).map((history) => (
          <button
            aria-current={history.uuid === conversationId ? "page" : undefined}
            className={`rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted ${history.uuid === conversationId ? "bg-muted" : ""}`}
            key={history.uuid}
            onClick={() => onOpenHistory(history.uuid)}
            type="button"
          >
            <span className="line-clamp-2 text-sm font-medium leading-5">{history.title}</span>
            <span className="block pt-1 text-xs text-muted-foreground">
              {history.workItem ? `${history.workItem.key} · ` : ""}
              {history.projectKey} · {formatHistoryTime(history.updatedAt)}
            </span>
          </button>
        ))}
        {!histories.length ? (
          <p className="py-6 text-center text-sm leading-6 text-muted-foreground">
            Completed chats will appear here.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

export function AgentIdeProjectAccordion({
  access,
  model,
  project,
  threadId
}: {
  access: AgentIdeAccess;
  model: AgentIdeModel;
  project?: ProjectManagerRecord;
  threadId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const copyThread = async () => {
    if (!threadId) return;
    await navigator.clipboard.writeText(threadId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <details className="group relative">
      <summary className="flex max-w-[30rem] cursor-pointer list-none items-center gap-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="truncate">
          {project ? `${project.key} · ${accessLabel(access)}` : "Select a project to begin"}
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      {project ? (
        <div className="absolute -left-16 top-full z-30 mt-3 w-72 rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {project.key} · {project.title}
              </p>
              <p className="pt-1 text-xs text-muted-foreground">
                {accessLabel(access)} · {model}
              </p>
            </div>
            <StatusBadge status={project.status} />
          </div>
          <p className="pt-3 leading-6 text-muted-foreground">
            {plainText(project.description) || "No project description has been added."}
          </p>
          <div className="grid gap-3 border-t pt-3">
            <ContextValue label="Module" value={project.moduleKey || "Not set"} />
            <ContextValue label="Reference type" value={project.referenceType || "Not set"} />
            <ContextValue label="Reference" value={project.referenceId || "Not set"} />
            <ContextValue label="Model" value={model} />
            <div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheckIcon className="size-3.5" /> Conversation
              </p>
              <div className="flex min-w-0 items-center gap-1 pt-1">
                <code className="truncate text-xs">{threadId ?? "New conversation"}</code>
                {threadId ? (
                  <Button
                    aria-label="Copy thread ID"
                    onClick={() => void copyThread()}
                    size="icon"
                    variant="ghost"
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </details>
  );
}

function ContextValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words pt-1">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
      {status}
    </span>
  );
}

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/gu, "").trim();
}

function accessLabel(access: AgentIdeAccess) {
  return {
    plan: "Plan mode",
    "read-only": "Read-only access",
    "ask-approval": "Ask for approval",
    "auto-approve": "Approve for me",
    "full-access": "Full access"
  }[access];
}
