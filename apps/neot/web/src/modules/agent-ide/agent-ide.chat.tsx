import {
  BotIcon,
  CheckIcon,
  ChevronDownIcon,
  Clock3Icon,
  CopyIcon,
  FileCode2Icon,
  FilesIcon,
  PaperclipIcon,
  PencilIcon,
  ThumbsDownIcon,
  ThumbsUpIcon
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AgentIdeComposer } from "./agent-ide.composer";
import { AgentIdeActionTimeline } from "./agent-ide.action-timeline";
import type {
  AgentIdeAccess,
  AgentIdeApproval,
  AgentIdeAttachment,
  AgentIdeChatMessage,
  AgentIdeModel
} from "./agent-ide.types";

type Props = {
  access: AgentIdeAccess;
  approval: AgentIdeApproval | null;
  activity: string;
  disabled: boolean;
  messages: AgentIdeChatMessage[];
  initialMessage?: string;
  model: AgentIdeModel;
  onAccessChange: (access: AgentIdeAccess) => void;
  onApprovalDecision: (decision: "accept" | "acceptForSession" | "decline") => void;
  onEditMessage: (messageId: string) => void;
  onFeedback: (messageId: string, feedback: "down" | "up") => void;
  onModelChange: (model: AgentIdeModel) => void;
  onReviewChanges: () => void;
  onSend: (message: string, attachments: AgentIdeAttachment[]) => void;
  projectTitle?: string;
  running: boolean;
};

const suggestions = [
  "Summarize this project and its current risks",
  "What should we work on next?",
  "Review the architecture and suggest a roadmap"
];

export function AgentIdeChat({
  access,
  approval,
  activity,
  disabled,
  messages,
  initialMessage,
  model,
  onAccessChange,
  onApprovalDecision,
  onEditMessage,
  onFeedback,
  onModelChange,
  onReviewChanges,
  onSend,
  projectTitle,
  running
}: Props) {
  const [message, setMessage] = useState(initialMessage ?? "");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, running]);

  const copyMessage = async (entry: AgentIdeChatMessage) => {
    await navigator.clipboard.writeText(entry.text);
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const editMessage = (entry: AgentIdeChatMessage) => {
    setMessage(entry.text);
    onEditMessage(entry.id);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-muted/10">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-7">
          {messages.length ? (
            messages.map((entry) =>
              entry.role === "user" ? (
                <UserMessage
                  copied={copiedId === entry.id}
                  entry={entry}
                  key={entry.id}
                  onCopy={() => void copyMessage(entry)}
                  onEdit={() => editMessage(entry)}
                />
              ) : (
                <AssistantMessage
                  copied={copiedId === entry.id}
                  entry={entry}
                  key={entry.id}
                  onCopy={() => void copyMessage(entry)}
                  onFeedback={(feedback) => onFeedback(entry.id, feedback)}
                  onReviewChanges={onReviewChanges}
                  running={running && entry === messages.at(-1)}
                />
              )
            )
          ) : (
            <EmptyChat
              disabled={disabled}
              onSend={(value) => onSend(value, [])}
              {...(projectTitle ? { projectTitle } : {})}
            />
          )}
          <div ref={endRef} />
        </div>
      </div>
      {approval ? (
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-5 pb-1 text-sm sm:px-8">
          <div className="min-w-0 flex-1">
            <p className="font-medium">Codex needs your approval</p>
            <p className="truncate text-xs text-muted-foreground">{approval.reason}</p>
          </div>
          <button
            className="rounded-md px-3 py-2 text-xs hover:bg-muted"
            onClick={() => onApprovalDecision("decline")}
            type="button"
          >
            Decline
          </button>
          <button
            className="rounded-md border px-3 py-2 text-xs hover:bg-muted"
            onClick={() => onApprovalDecision("accept")}
            type="button"
          >
            Approve once
          </button>
          <button
            className="rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground"
            onClick={() => onApprovalDecision("acceptForSession")}
            type="button"
          >
            Approve for chat
          </button>
        </div>
      ) : null}
      <AgentIdeComposer
        access={access}
        activity={activity}
        disabled={disabled}
        message={message}
        model={model}
        onAccessChange={onAccessChange}
        onMessageChange={setMessage}
        onModelChange={onModelChange}
        onSend={onSend}
        running={running}
      />
    </section>
  );
}

function UserMessage({
  copied,
  entry,
  onCopy,
  onEdit
}: {
  copied: boolean;
  entry: AgentIdeChatMessage;
  onCopy: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="group flex justify-end">
      <div className="max-w-[78%]">
        <div className="rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
          {entry.attachments.length ? (
            <div className="mb-2 flex flex-wrap justify-end gap-1.5">
              {entry.attachments.map((attachment) => (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-primary-foreground/10 px-2 py-1 text-xs"
                  key={`${entry.id}-${attachment.name}`}
                >
                  <PaperclipIcon className="size-3" /> {attachment.name}
                </span>
              ))}
            </div>
          ) : null}
          <p className="whitespace-pre-wrap">{entry.text}</p>
        </div>
        <div className="flex items-center justify-end gap-1 pt-1.5 text-xs text-muted-foreground">
          <time className="pr-1">{formatTime(entry.createdAt)}</time>
          <button
            aria-label="Copy message"
            className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus:opacity-100"
            onClick={onCopy}
            type="button"
          >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </button>
          <button
            aria-label="Edit message"
            className="rounded p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus:opacity-100"
            onClick={onEdit}
            type="button"
          >
            <PencilIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function AssistantMessage({
  copied,
  entry,
  onCopy,
  onFeedback,
  onReviewChanges,
  running
}: {
  copied: boolean;
  entry: AgentIdeChatMessage;
  onCopy: () => void;
  onFeedback: (feedback: "down" | "up") => void;
  onReviewChanges: () => void;
  running: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const elapsed = useElapsed(entry, running);
  const visibleFiles = expanded ? entry.files : entry.files.slice(0, 3);
  const hiddenFiles = entry.files.length - visibleFiles.length;
  return (
    <article className="group flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <BotIcon className="size-4" />
      </span>
      <div className="min-w-0 max-w-4xl flex-1 pt-1">
        <div className="whitespace-pre-wrap text-sm leading-7">
          {entry.text || (running ? "Thinking…" : "No response returned.")}
        </div>
        <AgentIdeActionTimeline actions={entry.actions} running={running} />
        {entry.files.length ? (
          <section className="mt-4 overflow-hidden rounded-xl border bg-muted/20 text-xs">
            <header className="flex items-center justify-between gap-3 border-b px-3 py-2.5">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <FilesIcon className="size-4" /> Edited {entry.files.length} file
                {entry.files.length === 1 ? "" : "s"}
              </span>
              <button
                className="rounded-md border bg-background px-2.5 py-1.5 font-medium hover:bg-muted"
                onClick={onReviewChanges}
                type="button"
              >
                Review
              </button>
            </header>
            <div className="grid gap-1.5 px-3 py-2.5">
              {visibleFiles.map((file) => (
                <div className="flex min-w-0 items-center gap-2 text-muted-foreground" key={file}>
                  <FileCode2Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{file}</span>
                </div>
              ))}
              {hiddenFiles > 0 ? (
                <button
                  className="flex items-center gap-1 py-1 text-left font-medium hover:text-foreground"
                  onClick={() => setExpanded(true)}
                  type="button"
                >
                  Show {hiddenFiles} more file{hiddenFiles === 1 ? "" : "s"}{" "}
                  <ChevronDownIcon className="size-3.5" />
                </button>
              ) : expanded && entry.files.length > 3 ? (
                <button
                  className="py-1 text-left font-medium hover:text-foreground"
                  onClick={() => setExpanded(false)}
                  type="button"
                >
                  Show fewer files
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
        {entry.text || running ? (
          <div className="pointer-events-none flex items-center gap-1 pt-2 text-xs text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <button
              aria-label="Copy response"
              className="rounded p-1.5 hover:bg-muted hover:text-foreground"
              onClick={onCopy}
              type="button"
            >
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            </button>
            <FeedbackButton
              active={entry.feedback === "up"}
              disabled={running || entry.id.length !== 16}
              label="Helpful response"
              onClick={() => onFeedback("up")}
            >
              <ThumbsUpIcon />
            </FeedbackButton>
            <FeedbackButton
              active={entry.feedback === "down"}
              disabled={running || entry.id.length !== 16}
              label="Unhelpful response"
              onClick={() => onFeedback("down")}
            >
              <ThumbsDownIcon />
            </FeedbackButton>
            <span className="flex items-center gap-1 px-1.5">
              <Clock3Icon className="size-3.5" /> Worked for {formatDuration(elapsed)}
            </span>
            <time className="px-1.5">{formatTime(entry.createdAt)}</time>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function FeedbackButton({
  active,
  children,
  disabled,
  label,
  onClick
}: {
  active: boolean;
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`rounded p-1.5 hover:bg-muted hover:text-foreground disabled:opacity-40 [&_svg]:size-3.5 ${active ? "bg-muted text-foreground" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function useElapsed(entry: AgentIdeChatMessage, running: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [running]);
  return entry.durationMs ?? Math.max(0, now - entry.createdAt);
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.round(milliseconds / 1_000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function EmptyChat({
  disabled,
  onSend,
  projectTitle
}: {
  disabled: boolean;
  onSend: (message: string) => void;
  projectTitle?: string;
}) {
  return (
    <div className="grid min-h-[26rem] place-items-center text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <BotIcon className="size-5" />
        </span>
        <h2 className="pt-4 text-lg font-semibold">
          {projectTitle ? `Work with ${projectTitle}` : "Start a project conversation"}
        </h2>
        <p className="mx-auto max-w-md pt-1 text-sm leading-6 text-muted-foreground">
          Codex receives the selected project reference, attached context, model, and access mode.
        </p>
        {!disabled ? (
          <div className="flex max-w-xl flex-wrap justify-center gap-2 pt-5">
            {suggestions.map((suggestion) => (
              <button
                className="rounded-full border bg-background px-3 py-2 text-sm hover:bg-muted"
                key={suggestion}
                onClick={() => onSend(suggestion)}
                type="button"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(value);
}
