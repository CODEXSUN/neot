import {
  Bot,
  Check,
  ChevronDown,
  CircleStop,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Send,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import type { AgentReasoningEffort, FileEntry, GitChange, Workspace } from "../contracts/desktop";
import type { ResourceState } from "../shell/use-desktop-session";
import { useDesktopPerformance } from "../shell/desktop-performance";
import { AgentErrorBanner } from "./agent-error-banner";
import { AgentChatHistory } from "./agent-chat-history";
import { AgentChatTabs } from "./agent-chat-tabs";
import { AgentMessageActions } from "./agent-message-actions";
import { ConversationRail } from "./conversation-rail";
import {
  AgentWelcome,
  ApprovalCard,
  EnvironmentPanel,
  RunTimeline
} from "./agent-workspace-parts";
import "./agent-workspace.css";
import { useAgentSession } from "./use-agent-session";

const AgentMarkdown = lazy(() =>
  import("./agent-markdown").then((module) => ({ default: module.AgentMarkdown }))
);

export function AgentWorkspace({
  changes,
  changesState,
  files,
  filesState,
  onOpenFile,
  onOpenProjectOverview,
  onRefreshChanges,
  workspace
}: {
  changes: GitChange[];
  changesState: ResourceState;
  files: FileEntry[];
  filesState: ResourceState;
  onOpenFile: (path: string) => void;
  onOpenProjectOverview: () => void;
  onRefreshChanges: () => Promise<void>;
  workspace: Workspace;
}) {
  const session = useAgentSession({ onRefreshChanges });
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [openTaskIds, setOpenTaskIds] = useState<number[]>([]);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  const performance = useDesktopPerformance();
  const activeTask = session.tasks.find((task) => task.id === session.activeTaskId);

  useEffect(() => {
    const availableTaskIds = new Set(session.tasks.map((task) => task.id));
    setOpenTaskIds((current) => {
      const retained = current.filter((taskId) => availableTaskIds.has(taskId));
      if (session.activeTaskId && !retained.includes(session.activeTaskId)) {
        return [...retained, session.activeTaskId];
      }
      return retained;
    });
  }, [session.activeTaskId, session.tasks]);

  useEffect(() => {
    const prepareTask = (event: Event) => {
      const taskTitle = (event as CustomEvent<string>).detail;
      if (typeof taskTitle === "string" && taskTitle.trim()) {
        session.setComposer(`Work on this task: ${taskTitle.trim()}`);
      }
    };
    window.addEventListener("neot:prepare-agent-task", prepareTask);
    return () => window.removeEventListener("neot:prepare-agent-task", prepareTask);
  }, [session.setComposer]);

  const openTasks = openTaskIds
    .map((taskId) => session.tasks.find((task) => task.id === taskId))
    .filter((task): task is NonNullable<typeof task> => Boolean(task));

  function openTask(task: NonNullable<typeof activeTask>) {
    setOpenTaskIds((current) => current.includes(task.id) ? current : [...current, task.id]);
    void session.openTask(task);
  }

  function closeTaskTab(taskId: number) {
    if (openTasks.length < 2 || session.busy) return;
    const closingIndex = openTasks.findIndex((task) => task.id === taskId);
    const remaining = openTasks.filter((task) => task.id !== taskId);
    setOpenTaskIds(remaining.map((task) => task.id));
    if (taskId !== session.activeTaskId) return;
    const replacement = remaining[Math.min(closingIndex, remaining.length - 1)];
    if (replacement) void session.openTask(replacement);
  }

  return (
    <section className={`agent-layout${leftDrawerOpen ? "" : " left-collapsed"}${rightDrawerOpen ? "" : " right-collapsed"}`}>
      <aside className={`agent-history${leftDrawerOpen ? "" : " collapsed"}`}>
        <AgentChatHistory
          activeTaskId={session.activeTaskId}
          busy={session.busy}
          onArchive={(task) => void session.archiveTask(task)}
          onDelete={(task) => session.deleteTask(task)}
          onNewDiscussion={() => void session.newDiscussion()}
          onOpenTask={openTask}
          onRequestReview={(task) => void session.requestTaskReview(task)}
          onRename={(task, title) => session.renameTask(task, title)}
          tasks={session.tasks}
        />
      </aside>

      <div className={`agent-chat${openTasks.length > 1 ? " has-open-chat-tabs" : ""}`}>
        <header className="agent-chat-header">
          <div className="agent-title-wrapper">
            <button
              type="button"
              className={`drawer-toggle-btn${leftDrawerOpen ? " active" : ""}`}
              onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
              title={leftDrawerOpen ? "Collapse chat history" : "Expand chat history"}
            >
              {leftDrawerOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>

            <button
              aria-label={`Open ${workspace.name} project overview`}
              className="agent-title agent-title-button"
              onClick={onOpenProjectOverview}
              title={`Open ${workspace.name} project overview`}
              type="button"
            >
              <Bot size={16} />
              <span><strong>{workspace.name}</strong><small className="agent-chat-tab">{activeTask?.title ?? "Repository discussion"}</small></span>
            </button>
          </div>

          <div className="agent-header-actions">
            <ModelPreferencesMenu
              connection={session.connection}
              disabled={session.busy}
              onChange={(model, effort) => void session.updateAgentPreferences("codex", model, effort)}
              open={modelMenuOpen}
              setOpen={setModelMenuOpen}
              status={session.runtime}
            />

            <small className={`agent-state ${session.running ? "running" : session.runtime === "unavailable" ? "unavailable" : "ready"}`}>
              {session.running ? (
                <>
                  <LoaderCircle size={12} className="spin" /> Agent working
                </>
              ) : session.runtime === "unavailable" ? (
                "Agent unavailable"
              ) : (
                "Connected"
              )}
            </small>

            <button
              type="button"
              className={`drawer-toggle-btn${rightDrawerOpen ? " active" : ""}`}
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
              title={rightDrawerOpen ? "Collapse Right Drawer (Environment & Changes)" : "Expand Right Drawer (Environment & Changes)"}
            >
              {rightDrawerOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>
          </div>
        </header>

        <AgentChatTabs
          activeTaskId={session.activeTaskId}
          disabled={session.busy}
          onClose={closeTaskTab}
          onOpen={openTask}
          tasks={openTasks}
        />

        <div className="agent-transcript-shell">
          <ConversationRail messages={session.messages} transcript={session.transcript} />
          <div className="agent-transcript" ref={session.transcript}>
            {session.messages.length === 0 ? (
              <AgentWelcome workspace={workspace} onPrompt={session.setComposer} />
            ) : (
              session.messages.map((message) => (
                <article
                  className={`agent-message ${message.role}`}
                  data-message-id={message.id}
                  key={message.id}
                >
                  <span>{message.role === "agent" ? <Bot size={15} /> : "You"}</span>
                  {message.role === "agent" ? (
                    <Suspense fallback={<p>{message.text}</p>}>
                      <AgentMarkdown text={message.text} />
                    </Suspense>
                  ) : (
                    <p>{message.text}</p>
                  )}
                  <AgentMessageActions createdAt={message.createdAt} text={message.text} />
                </article>
              ))
            )}

            {session.runItems.length ? <RunTimeline items={session.runItems} /> : null}
            {session.approval ? (
              <ApprovalCard approval={session.approval} onDecide={session.answerApproval} />
            ) : null}
            {session.stalled ? (
              <div className="agent-stalled">
                <LoaderCircle size={14} /> No agent activity for one minute. You can wait or stop
                this turn.
              </div>
            ) : null}
            {session.error ? (
              <AgentErrorBanner message={session.error} />
            ) : null}
          </div>
        </div>

        <div className="agent-composer">
          <textarea
            aria-label="Message the repository discussion agent"
            onChange={(event) => session.setComposer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void session.send();
              }
            }}
            placeholder="Discuss this repository, review an approach, or plan work..."
            rows={3}
            value={session.composer}
          />
          <footer>
            <div className="agent-composer-options">
              <span className="agent-discussion-scope">Discussion only · To code, open a Project Coder Agent</span>
            </div>
            <div className="agent-composer-actions">
              {session.running ? (
                <button
                  className="interrupt-turn"
                  onClick={() => void session.interrupt()}
                  type="button"
                >
                  <CircleStop size={14} /> Stop
                </button>
              ) : null}
              <button
                className="send-turn"
                disabled={!session.composer.trim() || session.busy}
                onClick={() => void session.send()}
                type="button"
              >
                <Send size={14} />
              </button>
            </div>
          </footer>
        </div>
      </div>

      <div className={`agent-environment-container${rightDrawerOpen ? "" : " collapsed"}`}>
        <EnvironmentPanel
          changes={changes}
          changesState={changesState}
          diff={session.diff}
          files={files}
          filesState={filesState}
          onOpenFile={onOpenFile}
          performance={performance}
          workspace={workspace}
        />
      </div>
    </section>
  );
}

const CODEX_MODELS = [
  { description: "Balanced speed and quality", id: "gpt-5.6-terra", label: "5.6 Terra" },
  { description: "Fastest option for focused tasks", id: "gpt-5.6-luna", label: "5.6 Luna" }
];

const EFFORTS: { description: string; id: AgentReasoningEffort; label: string }[] = [
  { description: "Fast responses for routine work", id: "low", label: "Light" },
  { description: "Balanced speed and depth", id: "medium", label: "Medium" },
  { description: "More deliberate reasoning for difficult work", id: "high", label: "Heavy" }
];

function ModelPreferencesMenu({
  connection,
  disabled,
  onChange,
  open,
  setOpen,
  status
}: {
  connection: { effort: AgentReasoningEffort; model: string; provider: string };
  disabled: boolean;
  onChange: (model: string, effort: AgentReasoningEffort) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  status: "idle" | "connecting" | "ready" | "unavailable";
}) {
  const update = (model: string, effort: AgentReasoningEffort) => {
    onChange(model, effort);
    setOpen(false);
  };

  return (
    <div className="agent-model-menu">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={`agent-connection-badge ${status === "ready" ? "connected" : ""}`}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        type="button"
      >
        <i aria-hidden="true" />
        {connection.provider} · {connection.model} · {effortLabel(connection.effort)}
        <ChevronDown aria-hidden="true" size={12} />
      </button>
      {open ? (
        <div aria-label="Codex model preferences" className="agent-model-menu-popover" role="menu">
          <p>Model</p>
          {CODEX_MODELS.map((model) => (
            <button
              className={connection.model === model.id ? "selected" : ""}
              key={model.id}
              onClick={() => update(model.id, connection.effort)}
              role="menuitemradio"
              type="button"
            >
              <span><strong>{model.label}</strong><small>{model.description}</small></span>
              {connection.model === model.id ? <Check aria-label="Selected" size={14} /> : null}
            </button>
          ))}
          <p>Reasoning effort</p>
          {EFFORTS.map((effort) => (
            <button
              className={connection.effort === effort.id ? "selected" : ""}
              key={effort.id}
              onClick={() => update(connection.model, effort.id)}
              role="menuitemradio"
              type="button"
            >
              <span><strong>{effort.label}</strong><small>{effort.description}</small></span>
              {connection.effort === effort.id ? <Check aria-label="Selected" size={14} /> : null}
            </button>
          ))}
          <footer>Applies to the next Codex chat.</footer>
        </div>
      ) : null}
    </div>
  );
}

function effortLabel(effort: AgentReasoningEffort) {
  return { high: "Heavy", low: "Light", medium: "Medium" }[effort];
}
