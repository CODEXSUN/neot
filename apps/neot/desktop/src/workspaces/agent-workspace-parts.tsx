import {
  Bot,
  CheckCircle2,
  Code2,
  FileDiff,
  GitBranch,
  LoaderCircle,
  Play,
  Search,
  ShieldCheck,
  TerminalSquare
} from "lucide-react";
import type { FileEntry, GitChange, Workspace } from "../contracts/desktop";
import type { ResourceState } from "../shell/use-desktop-session";
import type { DesktopPerformanceSample } from "../shell/desktop-performance";

export type RunItem = { id: string; label: string; status: string; type: string };
export type Approval = { id: number; command: string; reason: string };
type Decision = "accept" | "acceptForSession" | "decline";

export function AgentWelcome({
  workspace,
  onPrompt
}: {
  workspace: Workspace;
  onPrompt: (value: string) => void;
}) {
  const prompts: Array<[label: string, prompt: string]> = [
    ["Repository overview", "Explain this codebase"],
    ["Review the current changes", "Review the current changes"],
    ["Plan a project task", "Help me plan a project task"]
  ];
  return (
    <div className="agent-welcome">
      <section className="discussion-board" aria-label="Repository discussion starters">
        <header>
          <span className="discussion-board-icon"><Bot size={16} /></span>
          <div>
            <small>Discussion board</small>
            <h1>{workspace.name}</h1>
          </div>
        </header>
        <p>Ask about architecture, current decisions, or the next project task.</p>
        <div className="discussion-board-prompts">
          {prompts.map(([label, prompt]) => (
            <button key={label} onClick={() => onPrompt(prompt)} type="button">{label}</button>
          ))}
        </div>
        <footer>Read-only discussion · Use a Project Coder Agent to implement code.</footer>
      </section>
    </div>
  );
}

export function RunTimeline({ items }: { items: RunItem[] }) {
  const activeCount = items.filter(isActiveRunItem).length;

  return (
    <section className={`run-timeline${activeCount ? " active" : ""}`}>
      <div className="run-summary">
        {activeCount ? <LoaderCircle className="spin" size={15} /> : <CheckCircle2 size={15} />}
        <span>
          <strong>{activeCount ? "Agent working" : "Work completed"}</strong>
          <small>{runSummary(items.length, activeCount)}</small>
        </span>
      </div>
      <div className="run-list" role="status">
          {items.map((item) => (
            <div className={isActiveRunItem(item) ? "run-item active" : "run-item"} key={item.id}>
              <RunItemIcon item={item} />
              <span title={item.label}>{item.label}</span>
              <small>{statusLabel(item.status)}</small>
            </div>
          ))}
      </div>
    </section>
  );
}

export function isActiveRunItem(item: RunItem) {
  return !["cancelled", "canceled", "completed", "declined", "failed", "success"].includes(
    item.status.toLowerCase()
  );
}

function RunItemIcon({ item }: { item: RunItem }) {
  if (item.type === "commandExecution") return <TerminalSquare size={14} />;
  if (item.type === "webSearch") return <Search size={14} />;
  return <Code2 size={14} />;
}

function runSummary(total: number, active: number) {
  if (active) return `${active} active · ${total} ${total === 1 ? "action" : "actions"}`;
  return `${total} ${total === 1 ? "action" : "actions"}`;
}

function statusLabel(status: string) {
  return status.replace(/([a-z])([A-Z])/gu, "$1 $2").toLowerCase();
}

export function ApprovalCard({
  approval,
  onDecide
}: {
  approval: Approval;
  onDecide: (decision: Decision) => Promise<void>;
}) {
  return (
    <div className="approval-card">
      <ShieldCheck size={18} />
      <div>
        <strong>Approval required</strong>
        <p>{approval.reason}</p>
        <code>{approval.command}</code>
        <footer>
          <button onClick={() => void onDecide("decline")} type="button">Decline</button>
          <button onClick={() => void onDecide("acceptForSession")} type="button">Allow for task</button>
          <button className="primary" onClick={() => void onDecide("accept")} type="button">Allow once</button>
        </footer>
      </div>
    </div>
  );
}

export function EnvironmentPanel({
  changes,
  changesState,
  diff,
  files,
  filesState,
  onOpenFile,
  performance,
  workspace
}: {
  changes: GitChange[];
  changesState: ResourceState;
  diff: string;
  files: FileEntry[];
  filesState: ResourceState;
  onOpenFile: (path: string) => void;
  performance: DesktopPerformanceSample[];
  workspace: Workspace;
}) {
  return (
    <aside className="agent-environment">
      <header>Environment</header>
      <section>
        <h2><FileDiff size={15} /> Changes <b>{changes.length}</b></h2>
        {changes.slice(0, 6).map((change) => (
          <button key={change.path} onClick={() => onOpenFile(change.path)} type="button">
            <span>{change.path}</span><small>{change.status}</small>
          </button>
        ))}
        {changesState === "loading" ? <p>Refreshing source control...</p> : null}
        {changesState === "ready" && changes.length === 0 ? <p>Working tree is clean.</p> : null}
        {changesState === "unavailable" ? <p>Source control is unavailable.</p> : null}
      </section>
      <section>
        <h2><GitBranch size={15} /> Local</h2>
        <div className="environment-row"><span>Branch</span><strong>{workspace.branch}</strong></div>
        <div className="environment-row">
          <span>Root entries</span>
          <strong>{filesState === "loading" ? "Indexing" : files.length}</strong>
        </div>
      </section>
      {diff ? (
        <section><h2><Play size={15} /> Latest diff</h2><pre>{diff.slice(0, 1600)}</pre></section>
      ) : null}
      {performance.length ? (
        <section>
          <h2><Play size={15} /> Local performance</h2>
          {performance.map((sample, index) => (
            <div className="environment-row" key={`${sample.at}-${sample.operation}-${index}`}>
              <span title={sample.detail}>{sample.operation}</span>
              <strong>{formatDuration(sample.durationMs)}</strong>
            </div>
          ))}
        </section>
      ) : null}
    </aside>
  );
}

function formatDuration(durationMs: number) {
  return durationMs >= 1_000 ? `${(durationMs / 1_000).toFixed(1)}s` : `${Math.round(durationMs)}ms`;
}
