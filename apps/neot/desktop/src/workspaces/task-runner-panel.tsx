import { ArrowRight, Bot, CheckCircle2, Circle, CircleStop, Copy, LoaderCircle, PanelLeftClose, PanelLeftOpen, Play, Plus, Route, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AgentProvider, LocalTask } from "../contracts/desktop";
import type { RunItem } from "./agent-workspace-parts";
import { desktopClient } from "../services/desktop-client";
import { useTaskRunnerSession } from "./use-task-runner-session";
import { actionChoicesFrom, asksForTextInput, choiceQuestionFrom } from "./agent-protocol";
import "./task-runner-panel.css";
import "./task-runner-refinements.css";

type RunnerState = { approval?: { command: string; reason: string } | undefined; busy: boolean; completed: boolean; error?: string | undefined; finalReply?: string | undefined; running: boolean };
type ApprovalDecision = "accept" | "acceptForSession" | "decline";
const providerModels: Record<AgentProvider, readonly string[]> = {
  claude: [],
  codex: ["gpt-5.6-terra", "gpt-5.6-luna"],
  gemini: ["gemini-2.0-flash", "gemini-2.0-flash-lite-preview", "gemini-2.0-pro-exp-02-05"],
  ollama: ["local model"],
  opencode: ["nvidia-nemotron"],
  openrouter: []
};
const providerLabels: Record<AgentProvider, string> = { claude: "Claude", codex: "Codex", gemini: "Gemini", ollama: "Local Ollama", opencode: "OpenCode", openrouter: "OpenRouter" };

export function TaskRunnerPanel({ connection, initialTaskId, onPreferenceChange, onRefreshChanges }: { connection: { id: AgentProvider; model: string; provider: string }; initialTaskId?: number; onPreferenceChange: (provider: AgentProvider, model: string) => Promise<void>; onRefreshChanges: () => Promise<void> }) {
  const [draft, setDraft] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<number>();
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const selected = useMemo(() => tasks.find((task) => task.id === selectedId) ?? tasks[0], [selectedId, tasks]);
  const runner = useTaskRunnerSession(onRefreshChanges);

  useEffect(() => { void loadTasks(); }, []);
  useEffect(() => { if (initialTaskId) setSelectedId(initialTaskId); }, [initialTaskId]);
  useEffect(() => { if (selected) void runner.select(selected); }, [selected?.id]);

  async function loadTasks() {
    const saved = await desktopClient.listTasks();
    setTasks(saved);
    setSelectedId((current) => current ?? saved[0]?.id);
  }

  async function createTask() {
    const execution = draft.trim();
    if (!execution) return;
    const title = normalizeTaskTitle(draftTitle || execution);
    setCreateError(undefined);
    try {
      const saved = await desktopClient.saveTask(title, execution);
      setTasks((current) => [saved, ...current]);
      setSelectedId(saved.id);
      setDraft("");
      setDraftTitle("");
      setCreateOpen(false);
    } catch (reason) {
      setCreateError(`Could not create the task. ${String(reason)}`);
    }
  }

  return <section className="task-runner-page">
    <div className={`task-runner-shell${drawerOpen ? "" : " task-drawer-collapsed"}`}>
      <aside className="task-runner-list">
        <button aria-label={drawerOpen ? "Collapse task drawer" : "Expand task drawer"} className="task-drawer-toggle" onClick={() => setDrawerOpen((open) => !open)} title={drawerOpen ? "Collapse task drawer" : "Expand task drawer"} type="button">{drawerOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}</button>
        {drawerOpen ? <>
        <button className="task-create-trigger" onClick={() => { setCreateError(undefined); setDraft(""); setDraftTitle(""); setCreateOpen(true); }} type="button"><Plus size={16} /> New task</button>
        <p className="task-runner-list-label">Local tasks <span>{tasks.length}</span></p>
        <div>{tasks.map((task) => <button className={task.id === selected?.id ? "selected" : ""} key={task.id} onClick={() => setSelectedId(task.id)} type="button"><TaskStatus status={task.status} /><span><strong>{task.title}</strong><small>{task.status === "todo" ? "Ready to plan" : task.status}</small></span><ArrowRight size={15} /></button>)}</div>
        </> : null}
      </aside>
      <main className="task-runner-detail">
        {selected ? <Runner connection={connection} onApproval={runner.answer} onChoice={runner.respond} onPreferenceChange={onPreferenceChange} onRun={() => runner.run(selected)} onStop={runner.stop} runItems={runner.runItems} setTasks={setTasks} state={{ approval: runner.approval, busy: runner.running, completed: runner.runnerTask?.runStatus === "completed", error: runner.error, finalReply: runner.finalReply, running: runner.running }} task={selected} /> : <div className="task-runner-empty"><Route size={28} /><h2>Create a task</h2><p>Add a local task, then run it from this page.</p></div>}
      </main>
    </div>
    {createOpen ? <div aria-modal="true" className="task-create-modal" role="dialog">
      <form onSubmit={(event) => { event.preventDefault(); void createTask(); }}>
        <header><div><strong>Create local task</strong><p>Give it a short title, then add the full execution instructions.</p></div><button aria-label="Close task creator" onClick={() => setCreateOpen(false)} type="button"><X size={17} /></button></header>
        <label htmlFor="task-title">Title <small>Optional — generated from execution instructions</small></label>
        <input id="task-title" maxLength={180} onChange={(event) => setDraftTitle(event.target.value)} placeholder="For example: Guess my colour" value={draftTitle} />
        <label htmlFor="task-execution">Execution instructions</label>
        <textarea autoFocus id="task-execution" onChange={(event) => setDraft(event.target.value)} placeholder="For example: Ask a series of Yes or No questions, then reveal your colour guess only after I select Reveal." rows={6} value={draft} />
        {createError ? <p className="task-create-error">{createError}</p> : null}
        <footer><button onClick={() => setCreateOpen(false)} type="button">Cancel</button><button className="primary" disabled={!draft.trim()} type="submit">Create task</button></footer>
      </form>
    </div> : null}
  </section>;
}

function Runner({ connection, onApproval, onChoice, onPreferenceChange, onRun, onStop, runItems, setTasks, state, task }: { connection: { id: AgentProvider; model: string; provider: string }; onApproval: (decision: ApprovalDecision) => Promise<void>; onChoice: (choice: string) => Promise<void>; onPreferenceChange: (provider: AgentProvider, model: string) => Promise<void>; onRun: () => Promise<void>; onStop: () => Promise<void>; runItems: RunItem[]; setTasks: React.Dispatch<React.SetStateAction<LocalTask[]>>; state: RunnerState; task: LocalTask }) {
  const stages = ["Plan", "Approve", "Run", "Verify"];
  const current = state.running ? 2 : state.approval ? 1 : state.busy ? 0 : -1;
  const [runObserved, setRunObserved] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);
  const [copied, setCopied] = useState(false);
  const [responseText, setResponseText] = useState("");
  const canRun = connection.id === "codex" && task.status !== "paused";
  const choices = state.completed ? actionChoicesFrom(state.finalReply) : [];
  const needsResponse = state.completed && (choices.length > 0 || asksForTextInput(state.finalReply));

  useEffect(() => {
    if (state.busy) setRunObserved(true);
    if (!runObserved || state.busy) return;
    void saveStatus(state.error ? "todo" : "done");
    setRunObserved(false);
  }, [runObserved, state.busy, state.error]);

  async function saveStatus(status: LocalTask["status"]) {
    const saved = await desktopClient.setTaskStatus(task.id, status);
    setTasks((currentTasks) => currentTasks.map((item) => item.id === saved.id ? saved : item));
  }

  async function run() {
    setConfirmRun(false);
    await saveStatus("active");
    await onRun();
  }

  async function choose(choice: string) {
    await saveStatus("active");
    await onChoice(choice);
    setResponseText("");
  }

  async function sendTextResponse() {
    const answer = responseText.trim();
    if (answer) await choose(answer);
  }

  useEffect(() => { setResponseText(""); }, [task.id, state.finalReply]);

  async function copyOutcome() {
    const outcome = state.error ?? state.finalReply ?? "No final text response was received.";
    await navigator.clipboard.writeText(`Task: ${task.title}\nStatus: ${state.error ? "Failed" : state.completed ? "Completed" : "In progress"}\n\nResult or error:\n${outcome}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return <div className="task-runner-content">
    <header className="task-runner-run-header"><span className="task-runner-kicker"><Route size={15} /> LangGraph runner</span><label className="task-agent-badge"><Bot size={15} /><select aria-label="Runner agent" disabled={state.busy} onChange={(event) => { const provider = event.target.value as AgentProvider; void onPreferenceChange(provider, providerModels[provider][0] ?? ""); }} value={connection.id}>{(["codex", "opencode", "gemini", "ollama"] as AgentProvider[]).map((provider) => <option key={provider} value={provider}>{providerLabels[provider]}</option>)}</select><select aria-label="Runner model" disabled={state.busy} onChange={(event) => void onPreferenceChange(connection.id, event.target.value)} value={providerModels[connection.id].includes(connection.model) ? connection.model : providerModels[connection.id][0] ?? ""}>{providerModels[connection.id].map((model) => <option key={model} value={model}>{model}</option>)}</select></label></header>
    <h2>{task.title}</h2>
    <p className="task-runner-execution">{task.execution}</p>
    <p>This task runs here. The live status below is driven by the connected NEOT agent and its approval events.</p>
    <ol className="task-runner-flow">{stages.map((stage, index) => <Stage completed={state.completed} current={current} index={index} key={stage} label={stage} />)}</ol>
    {confirmRun ? <div className="task-runner-notice"><ShieldCheck size={18} /><span><strong>Run this task?</strong><small>The isolated runner will begin and return its final result here.</small><footer><button onClick={() => setConfirmRun(false)} type="button">No</button><button className="primary" onClick={() => void run()} type="button">Yes, run task</button></footer></span></div> : null}
    {state.approval ? <div className="task-runner-notice"><ShieldCheck size={18} /><span><strong>Approval requested</strong><small>{state.approval.command}: {state.approval.reason}</small><footer><button onClick={() => void onApproval("decline")} type="button">Decline</button><button onClick={() => void onApproval("acceptForSession")} type="button">Allow for task</button><button className="primary" onClick={() => void onApproval("accept")} type="button">Allow once</button></footer></span></div> : null}
    {runItems.length ? <div className="task-runner-activity"><strong>Live activity</strong>{runItems.slice(-6).map((item) => <div key={item.id}><span>{item.label}</span><small>{item.status}</small></div>)}</div> : null}
    {state.error ? <div className="task-runner-error"><span>{state.error}</span><button onClick={() => void copyOutcome()} type="button"><Copy size={14} />{copied ? "Copied" : "Copy error"}</button></div> : null}
    {!canRun ? <p className="task-runner-requirement">{task.status === "paused" ? "This task is paused. Resume it from Project tasks before running." : providerRequirement(connection.id)}</p> : null}
    <button className="task-runner-start" disabled={state.busy || !canRun} onClick={() => setConfirmRun(true)} type="button">
      {state.running ? <LoaderCircle className="spin" size={16} /> : <Play size={16} />}{state.running ? "Running task" : "Run task"}
    </button>
    {state.running ? <button className="task-runner-stop" onClick={() => void onStop()} type="button"><CircleStop size={16} /> Stop</button> : null}
    {state.completed ? <div className="task-runner-result"><CheckCircle2 size={18} /><span><header><strong>{needsResponse ? "Response needs your input" : state.finalReply ? "Task completed with a result" : "Task completed without a final reply"}</strong><button onClick={() => void copyOutcome()} type="button"><Copy size={14} />{copied ? "Copied" : "Copy"}</button></header><p>{needsResponse ? choiceQuestionFrom(state.finalReply) : state.finalReply || "No final text response was received. Review the recorded activity before treating this as a successful result."}</p>{needsResponse ? <footer className="task-runner-choice"><strong>{choices.length ? "Choose an answer or write your own" : "Write an answer"}</strong>{choices.length ? <span>{choices.map((choice, index) => <button className={index === 0 ? "primary" : ""} key={choice} onClick={() => void choose(choice)} type="button">{choice}</button>)}</span> : null}<form className="task-runner-text-response" onSubmit={(event) => { event.preventDefault(); void sendTextResponse(); }}><input aria-label="Task response" onChange={(event) => setResponseText(event.target.value)} placeholder="Write a response" value={responseText} /><button className="primary" disabled={!responseText.trim()} type="submit">Send</button></form></footer> : null}</span></div> : null}
  </div>;
}

function Stage({ completed, current, index, label }: { completed: boolean; current: number; index: number; label: string }) {
  const done = completed || index < current;
  const active = !completed && index === current;
  return <li className={active ? "active" : done ? "complete" : ""}><span>{done ? <CheckCircle2 size={15} /> : active ? <LoaderCircle className="spin" size={15} /> : index + 1}</span><strong>{label}</strong><small>{stageDescription(label)}</small>{index < 3 ? <ArrowRight size={15} /> : null}</li>;
}

function TaskStatus({ status }: { status: LocalTask["status"] }) { return status === "done" ? <CheckCircle2 className="task-runner-status done" size={16} /> : <Circle className={`task-runner-status ${status}`} size={16} />; }
function stageDescription(stage: string) { return { Approve: "Confirm protected actions", Plan: "Review scope and criteria", Run: "Execute through NEOT Agent", Verify: "Collect completion evidence" }[stage] ?? ""; }
function providerRequirement(provider: AgentProvider) {
  const requirements: Record<AgentProvider, string> = {
    claude: "This provider requires a verified execution adapter.",
    openrouter: "This provider requires a verified execution adapter.",
    gemini: "Gemini requires a configured API key and a verified Gemini execution adapter.",
    ollama: "Ollama requires a reachable local server and a verified local execution adapter.",
    opencode: "OpenCode is restricted to NVIDIA Nematron and requires the OpenCode bridge to be configured.",
    codex: ""
  };
  return requirements[provider];
}

function normalizeTaskTitle(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177).trimEnd()}...`;
}
