import { ArrowLeft, CalendarClock, ChevronDown, ChevronUp, Copy, ExternalLink, GitBranch, MoreHorizontal, Pause, Pencil, Play, Plus, RefreshCw, RotateCcw, ScrollText, Trash2, Wrench, X } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { DesktopWorkspace, ProjectSkill, ProjectTask, ProjectTaskRun } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { AgentMarkdown } from "./agent-markdown";
import { actionChoicesFrom, agentErrorFrom, asksForTextInput, choiceQuestionFrom, extractTextAt, parseAgentProtocolMessage, textAt, threadIdFrom } from "./agent-protocol";

const schedules: { label: string; value: ProjectTask["schedule"] }[] = [{ label: "Manual", value: "manual" }, { label: "Every Monday", value: "every-monday" }, { label: "Before every commit", value: "before-commit" }, { label: "On version update", value: "on-version-update" }];
const agents = [{ label: "Codex · gpt-5.6-terra", value: "codex:gpt-5.6-terra" }, { label: "Codex · gpt-5.6-luna", value: "codex:gpt-5.6-luna" }, { label: "OpenCode · Nematron 3 Ultra Free", value: "opencode:nemotron-3-ultra-free" }, { label: "Gemini · Gemini 2.0 Flash (setup required)", value: "gemini:gemini-2.0-flash" }, { label: "Local Ollama · local model (setup required)", value: "ollama:local-model" }];
type Form = { instructions: string; model: string; schedule: ProjectTask["schedule"]; skillPath: string | undefined; title: string };

export function ProjectTaskControl({ workspacePath }: { workspacePath: string }) {
  const [editor, setEditor] = useState<ProjectTask | "new">();
  const [forwardTask, setForwardTask] = useState<ProjectTask>();
  const [historyTask, setHistoryTask] = useState<ProjectTask>();
  const [pendingRun, setPendingRun] = useState<ProjectTask>();
  const [form, setForm] = useState<Form>({ instructions: "", model: "codex:gpt-5.6-terra", schedule: "manual", skillPath: undefined, title: "" });
  const [skills, setSkills] = useState<ProjectSkill[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [workspaces, setWorkspaces] = useState<DesktopWorkspace[]>([]);
  const seededWorkspace = useRef<string | undefined>(undefined);
  const execution = useProjectTaskExecution();

  useEffect(() => { void refresh(); }, [workspacePath]);
  useEffect(() => { void desktopClient.getDesktopSetup().then((setup) => setWorkspaces(setup.workspaces)); }, []);
  async function refresh() {
    const [saved, available] = await Promise.all([desktopClient.listProjectTasks(), desktopClient.listProjectSkills()]);
    setTasks(saved); setSkills(available);
    if (!isNEOTWorkspace(workspacePath) || saved.length || seededWorkspace.current === workspacePath) return;
    seededWorkspace.current = workspacePath;
    await Promise.all(neotProjectTasks(available).map((task) => desktopClient.saveProjectTask(task.title, task.instructions, task.schedule, task.agentModel, task.skillPath)));
    setTasks(await desktopClient.listProjectTasks());
  }
  function openCreate() { setForm({ instructions: "", model: "codex:gpt-5.6-terra", schedule: "manual", skillPath: undefined, title: "" }); setEditor("new"); }
  function openEdit(task: ProjectTask) { setForm({ instructions: task.instructions, model: normalizeAgent(task.agentModel), schedule: task.schedule, skillPath: task.skillPath ?? undefined, title: task.title }); setEditor(task); }
  async function save() {
    const title = normalizeTitle(form.title || form.instructions);
    if (!title || !form.instructions.trim()) return;
    if (editor && editor !== "new") await desktopClient.updateProjectTask(editor.id, title, form.instructions.trim(), form.schedule, form.model, editor.status, form.skillPath);
    else await desktopClient.saveProjectTask(title, form.instructions.trim(), form.schedule, form.model, form.skillPath);
    setEditor(undefined); await refresh();
  }
  async function update(task: ProjectTask, status: ProjectTask["status"], agentModel = normalizeAgent(task.agentModel)) { await desktopClient.updateProjectTask(task.id, task.title, task.instructions, task.schedule, agentModel, status, task.skillPath); await refresh(); }
  async function move(task: ProjectTask, direction: "up" | "down") { setTasks(await desktopClient.moveProjectTask(task.id, direction)); }
  async function remove(task: ProjectTask) { if (window.confirm(`Delete project task “${task.title}” and its history? This does not affect Task Runner tasks.`)) { await desktopClient.deleteProjectTask(task.id); await refresh(); } }
  if (historyTask) return <ProjectTaskHistory approval={execution.approval} onAnswerApproval={execution.answerApproval} onBack={() => setHistoryTask(undefined)} onRespond={execution.respond} onRun={() => execution.run(historyTask)} running={execution.running} task={historyTask} />;
  return <section className="project-automation"><section className="project-jobs"><header><div><h3>Project tasks</h3><p>Reusable project controls are separate from isolated Task Runner tasks.</p></div><div><span>{tasks.length} saved</span><button className="project-job-new-button" onClick={openCreate} type="button"><Plus size={14} /> New project task</button></div></header>{execution.error ? <p className="project-automation-error">{execution.error}</p> : null}<div className="project-job-table-scroll"><table className="project-job-table"><thead><tr><th>#</th><th>Project task</th><th>Agent and model</th><th>Schedule</th><th>Status</th><th>Actions</th></tr></thead><tbody>{tasks.length ? tasks.map((task, index) => <ProjectTaskRow index={index} key={task.id} onDelete={remove} onEdit={openEdit} onForward={() => setForwardTask(task)} onMove={move} onOpenHistory={() => setHistoryTask(task)} onRun={setPendingRun} onUpdate={update} running={execution.running} task={task} total={tasks.length} />) : <tr><td colSpan={6}>No project tasks configured. Add a recurring review, pre-commit check, or release-log task.</td></tr>}</tbody></table></div>{pendingRun ? <ProjectTaskRunPrompt onCancel={() => setPendingRun(undefined)} onConfirm={() => { const task = pendingRun; setPendingRun(undefined); void execution.run(task); }} task={pendingRun} /> : null}</section>{editor ? <TaskEditor editing={editor !== "new"} form={form} onChange={setForm} onClose={() => setEditor(undefined)} onSave={() => void save()} skills={skills} /> : null}{forwardTask ? <ProjectTaskForwardDialog onClose={() => setForwardTask(undefined)} sourceWorkspacePath={workspacePath} task={forwardTask} workspaces={workspaces} /> : null}</section>;
}

function useProjectTaskExecution() {
  const [approval, setApproval] = useState<{ id: number; command: string; reason: string }>();
  const [error, setError] = useState<string>();
  const [running, setRunning] = useState(false);
  const active = useRef<{ agentTaskId?: number; runId?: number; threadId?: string } | undefined>(undefined);
  const reply = useRef("");
  const resolveThread = useRef<((threadId: string) => void) | undefined>(undefined);

  useEffect(() => {
    let unlisten: () => void = () => undefined;
    void listen<unknown>("agent-event", (event) => {
      const message = parseAgentProtocolMessage(event.payload);
      if (!message) return;
      const threadId = threadIdFrom(message);
      if (threadId && !active.current?.threadId) {
        active.current = { ...active.current, threadId };
        resolveThread.current?.(threadId);
        resolveThread.current = undefined;
      }
      if (threadId && active.current?.threadId && threadId !== active.current.threadId) return;
      if (message.method === "item/agentMessage/delta") {
        reply.current += extractTextAt(message, "params", "delta") || extractTextAt(message, "params", "text");
      }
      if (message.method === "item/completed") {
        const text = extractTextAt(message, "params", "item", "text") || extractTextAt(message, "params", "item", "content");
        if (text) reply.current = text;
      }
      if (["item/commandExecution/requestApproval", "item/fileChange/requestApproval"].includes(message.method ?? "") && message.id !== undefined) {
        setApproval({ id: message.id, command: textAt(message, "params", "command") ?? "Workspace action", reason: textAt(message, "params", "reason") ?? "Approval is required to continue." });
      }
      const currentRun = active.current;
      if (message.method === "turn/completed" && currentRun?.runId !== undefined && currentRun.agentTaskId !== undefined) {
        const failure = agentErrorFrom(event.payload);
        const report = reply.current.trim() || failure || "The agent completed without a final report.";
        const status = failure || !reply.current.trim() ? "failed" : resultStatus(report);
        const agentTaskId = currentRun.agentTaskId;
        const runId = currentRun.runId;
        void desktopClient.setAgentTaskStatus(agentTaskId, status === "failed" ? "failed" : "completed").then(() => desktopClient.updateProjectTaskRun(runId, status, report));
        setRunning(false); active.current = undefined;
      }
    }).then((stop) => { unlisten = stop; });
    return () => unlisten();
  }, []);

  async function run(task: ProjectTask) {
    setApproval(undefined); setError(undefined); setRunning(true); reply.current = ""; active.current = undefined;
    const run = await desktopClient.queueProjectTaskRun(task.id);
    if (run.status === "queued") { setRunning(false); return; }
    try {
      await desktopClient.updateProjectTaskRun(run.id, "running", `Starting an isolated ${task.agentModel.startsWith("opencode:") ? "OpenCode" : "Codex"} project-task worktree.`);
      const skill = task.skillPath ? `\nRead the relevant skill instructions at: ${task.skillPath}` : "";
      const prompt = `Complete this Project Task in its isolated worktree. Return a clear final report with actual evidence. Do not perform protected GitHub, release, VPS, or destructive actions without requesting approval. When you need a human decision, ask one concise question and give 2-6 short bullet actions.\n\nTask: ${task.title}\n\nInstructions:\n${task.instructions}${skill}`;
      if (task.agentModel === "opencode:nemotron-3-ultra-free") {
        const agentTask = await desktopClient.saveAgentTask(`opencode-project-${run.id}`, task.title, "workspaceWrite", "project", task.id);
        active.current = { agentTaskId: agentTask.id, runId: run.id };
        await desktopClient.bindProjectTaskRunAgentTask(run.id, agentTask.id);
        await desktopClient.setAgentTaskStatus(agentTask.id, "running");
        const report = await desktopClient.runOpenCodeTask(agentTask.id, "opencode/nemotron-3-ultra-free", prompt);
        await desktopClient.setAgentTaskStatus(agentTask.id, "completed");
        await desktopClient.updateProjectTaskRun(run.id, resultStatus(report), report);
        setRunning(false); active.current = undefined;
        return;
      }
      if (!task.agentModel.startsWith("codex:")) throw new Error("This Project Task provider does not have a connected execution adapter.");
      await desktopClient.startAgentRuntime();
      const threadId = await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("The Codex runtime did not assign a thread ID in time.")), 30_000);
        resolveThread.current = (value) => { window.clearTimeout(timeout); resolve(value); };
        void desktopClient.startAgentThread().catch(reject);
      });
      active.current = { runId: run.id, threadId };
      const agentTask = await desktopClient.saveAgentTask(threadId, task.title, "workspaceWrite", "project", task.id);
      active.current = { ...active.current, agentTaskId: agentTask.id };
      await desktopClient.setAgentTaskStatus(agentTask.id, "running");
      await desktopClient.sendAgentTurn(agentTask.id, threadId, prompt, "workspaceWrite");
    } catch (reason) {
      const message = String(reason);
      setError(message); setRunning(false);
      if (active.current?.runId) void desktopClient.updateProjectTaskRun(active.current.runId, "failed", message);
      active.current = undefined;
    }
  }

  async function respond(task: ProjectTask, run: ProjectTaskRun, answer: string) {
    if (!run.agentTaskId || running) return;
    const prompt = `The user selected this project-task action: ${answer}\n\nContinue the same isolated Project Task from this report:\n${run.summary}\n\nReturn a clear updated report. If another decision is required, ask one concise question followed by 2-6 short bullet actions.`;
    setApproval(undefined); setError(undefined); setRunning(true); reply.current = "";
    try {
      const agentTask = await desktopClient.getAgentTask(run.agentTaskId);
      active.current = { agentTaskId: agentTask.id, runId: run.id, threadId: agentTask.threadId };
      await desktopClient.setAgentTaskStatus(agentTask.id, "running");
      await desktopClient.updateProjectTaskRun(run.id, "running", "Applying your selected action in the existing isolated worktree.");
      if (task.agentModel === "opencode:nemotron-3-ultra-free") {
        const report = await desktopClient.runOpenCodeTask(agentTask.id, "opencode/nemotron-3-ultra-free", prompt);
        await desktopClient.setAgentTaskStatus(agentTask.id, "completed");
        await desktopClient.updateProjectTaskRun(run.id, resultStatus(report), report);
        setRunning(false); active.current = undefined;
        return;
      }
      if (!task.agentModel.startsWith("codex:")) throw new Error("This Project Task provider does not have a connected execution adapter.");
      await desktopClient.startAgentRuntime();
      await desktopClient.resumeAgentThread(agentTask.id, agentTask.threadId);
      await desktopClient.sendAgentTurn(agentTask.id, agentTask.threadId, prompt, "workspaceWrite");
    } catch (reason) {
      const message = String(reason);
      setError(message); setRunning(false); active.current = undefined;
      await desktopClient.updateProjectTaskRun(run.id, "failed", message);
    }
  }

  async function answerApproval(decision: "accept" | "decline") {
    if (!approval) return;
    const current = approval;
    setApproval(undefined);
    await desktopClient.answerAgentApproval(current.id, decision);
  }

  return { approval, answerApproval, error, respond, run, running };
}

function ProjectTaskRow({ index, onDelete, onEdit, onForward, onMove, onOpenHistory, onRun, onUpdate, running, task, total }: { index: number; onDelete: (task: ProjectTask) => Promise<void>; onEdit: (task: ProjectTask) => void; onForward: () => void; onMove: (task: ProjectTask, direction: "up" | "down") => Promise<void>; onOpenHistory: () => void; onRun: (task: ProjectTask) => void; onUpdate: (task: ProjectTask, status: ProjectTask["status"], agentModel?: ProjectTask["agentModel"]) => Promise<void>; running: boolean; task: ProjectTask; total: number }) {
  const [logOpen, setLogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<CSSProperties>();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const Icon = taskIcon(task.title);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false); };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [menuOpen]);

  function toggleMenu() {
    if (menuOpen) { setMenuOpen(false); return; }
    const rect = menuButtonRef.current?.getBoundingClientRect();
    if (rect) {
      const openUpward = rect.bottom + 212 > window.innerHeight;
      setMenuPosition(openUpward
        ? { bottom: Math.max(8, window.innerHeight - rect.top + 4), right: Math.max(8, window.innerWidth - rect.right) }
        : { right: Math.max(8, window.innerWidth - rect.right), top: rect.bottom + 4 });
    }
    setMenuOpen(true);
  }

  return <><tr><td>{index + 1}</td><td><strong>{task.title}</strong>{task.skillPath ? <small className="project-task-skill"><Wrench size={12} /> {skillName(task.skillPath)}</small> : null}</td><td><select aria-label={`${task.title} model`} onChange={(event) => void onUpdate(task, task.status, event.target.value)} value={normalizeAgent(task.agentModel)}>{agents.map((agent) => <option key={agent.value} value={agent.value}>{agent.label}</option>)}</select></td><td><span className="project-job-schedule"><CalendarClock size={14} /> {scheduleLabel(task.schedule)}</span></td><td><span className={`project-job-status ${task.status}`}>{task.status}</span></td><td><div className="project-job-actions"><button disabled={task.status === "paused" || running} onClick={() => onRun(task)} type="button"><Play size={14} /> Run</button><button className="project-job-log-button" onClick={() => setLogOpen((open) => !open)} type="button"><ScrollText size={14} /> Log</button><div className={`project-job-overflow${menuOpen ? " open" : ""}`} ref={menuRef}><button aria-expanded={menuOpen} aria-label={`More actions for ${task.title}`} onClick={toggleMenu} ref={menuButtonRef} type="button"><MoreHorizontal size={16} /></button>{menuOpen ? <div className="project-job-menu" style={menuPosition}><button onClick={() => { setMenuOpen(false); onEdit(task); }} type="button"><Pencil size={14} /> Edit</button><button onClick={() => { setMenuOpen(false); onForward(); }} type="button"><Copy size={14} /> Copy to project</button>{index > 0 ? <button onClick={() => { setMenuOpen(false); void onMove(task, "up"); }} type="button"><ChevronUp size={14} /> Move up</button> : null}{index < total - 1 ? <button onClick={() => { setMenuOpen(false); void onMove(task, "down"); }} type="button"><ChevronDown size={14} /> Move down</button> : null}{task.status === "active" ? <button onClick={() => { setMenuOpen(false); void onUpdate(task, "paused"); }} type="button"><Pause size={14} /> Pause</button> : <button onClick={() => { setMenuOpen(false); void onUpdate(task, "active"); }} type="button"><RotateCcw size={14} /> Resume</button>}<button className="danger" onClick={() => { setMenuOpen(false); void onDelete(task); }} type="button"><Trash2 size={14} /> Delete</button></div> : null}</div></div></td></tr>{logOpen ? <tr className="project-job-log-row"><td colSpan={6}><div className="project-job-inline-log"><strong><Icon size={15} /> {taskLogLabel(task.title)}</strong><small>{scheduleLabel(task.schedule)} · {task.status}</small><div className="project-log-actions"><button title="Open full task history" onClick={onOpenHistory} type="button"><ExternalLink size={14} /></button><button title="Copy task instructions" onClick={() => void navigator.clipboard.writeText(task.instructions)} type="button"><Copy size={14} /></button><button title="Refresh configured details" onClick={() => setLogOpen((open) => !open)} type="button"><RefreshCw size={14} /></button></div><p>This compact log shows project-control context only. Open history to review all recorded run requests and queued work.</p></div></td></tr> : null}</>;
}

function ProjectTaskRunPrompt({ onCancel, onConfirm, task }: { onCancel: () => void; onConfirm: () => void; task: ProjectTask }) {
  return <section aria-live="polite" className="project-task-run-prompt"><div><strong>Run this task?</strong><p>The isolated runner will start a new worktree and record its final report in this project task log.</p><small>{task.title}</small></div><div><button onClick={onCancel} type="button">No</button><button className="primary" onClick={onConfirm} type="button">Yes, run task</button></div></section>;
}

function ProjectTaskHistory({ approval, onAnswerApproval, onBack, onRespond, onRun, running, task }: { approval: { command: string; reason: string } | undefined; onAnswerApproval: (decision: "accept" | "decline") => Promise<void>; onBack: () => void; onRespond: (task: ProjectTask, run: ProjectTaskRun, answer: string) => Promise<void>; onRun: () => Promise<void>; running: boolean; task: ProjectTask }) {
  const [runs, setRuns] = useState<ProjectTaskRun[]>([]); const [loading, setLoading] = useState(true); const [pendingRun, setPendingRun] = useState(false); const [lastSynced, setLastSynced] = useState<Date>();
  async function refresh() { setLoading(true); try { setRuns(await desktopClient.listProjectTaskRuns(task.id)); } finally { setLoading(false); } }
  useEffect(() => { void refresh(); }, [task.id]);
  useEffect(() => {
    let unlisten: () => void = () => undefined;
    void listen<ProjectTaskRun>("project-task-run-changed", (event) => {
      const run = event.payload;
      if (typeof run === "object" && run !== null && "projectTaskId" in run && run.projectTaskId !== task.id) return;
      setLastSynced(new Date());
      void refresh();
    }).then((stop) => { unlisten = stop; });
    return () => unlisten();
  }, [task.id]);
  async function removeRun(runId: number) { if (window.confirm("Delete this task-history record?")) { await desktopClient.deleteProjectTaskRun(runId); await refresh(); } }
  async function run() { setPendingRun(false); await onRun(); await refresh(); }
  return <section className="project-job-log-page"><header className="project-job-log-page-header"><button className="project-job-log-back" onClick={onBack} type="button"><ArrowLeft size={15} /> Project tasks</button><div><h2>{task.title}</h2><p>Project task history · isolated executions and persisted reports.</p></div><div className="project-job-history-actions"><button disabled={running} onClick={() => setPendingRun(true)} type="button"><Play size={14} /> {running ? "Running…" : "Run"}</button><button onClick={() => void refresh()} type="button"><RefreshCw className={loading ? "spin" : undefined} size={14} /> Refresh</button></div></header><div className="project-job-history-intent"><strong>Intent</strong><p>{task.instructions}</p><button onClick={() => void navigator.clipboard.writeText(task.instructions)} type="button"><Copy size={14} /> Copy instructions</button></div><p aria-live="polite" className="project-job-live-sync"><RefreshCw size={13} /> Live sync {lastSynced ? `updated ${lastSynced.toLocaleTimeString()}` : "watching task reports"}</p>{approval ? <ProjectTaskApproval approval={approval} onAnswer={onAnswerApproval} /> : null}{runs.length ? <div className="project-job-history-list">{runs.map((run) => <article className="project-job-log-session" key={run.id}><header><ScrollText size={16} /><div><strong>{run.status === "queued" ? "Queued run" : run.status === "awaiting-input" ? "Waiting for your input" : "Run request"}</strong><span>{formatTimestamp(run.createdAt)} · {run.status}</span></div><button aria-label="Copy task-history record" onClick={() => void navigator.clipboard.writeText(`${task.title}\n\n${run.summary}`)} type="button"><Copy size={14} /></button><button aria-label="Delete task-history record" onClick={() => void removeRun(run.id)} type="button"><Trash2 size={14} /></button></header><ProjectTaskReport text={run.summary} />{run.status === "awaiting-input" ? <ProjectTaskInteraction disabled={running} onRespond={(answer) => void onRespond(task, run, answer)} text={run.summary} /> : null}</article>)}</div> : <p className="project-job-log-page-empty">{loading ? "Loading task history…" : "No recorded run request yet. Run this project task to record its request or queued state."}</p>}{pendingRun ? <ProjectTaskRunPrompt onCancel={() => setPendingRun(false)} onConfirm={() => void run()} task={task} /> : null}</section>;
}

function ProjectTaskReport({ text }: { text: string }) {
  return <div className="project-task-mdx-report"><AgentMarkdown text={stripTerminalCodes(text)} /></div>;
}

function stripTerminalCodes(value: string) { return value.replace(new RegExp("\\\\u001B\\\\[[0-?]*[ -/]*[@-~]", "g"), "").trim(); }

function ProjectTaskInteraction({ disabled, onRespond, text }: { disabled: boolean; onRespond: (answer: string) => void; text: string }) {
  const [response, setResponse] = useState("");
  const choices = actionChoicesFrom(text);
  const question = choiceQuestionFrom(text);
  return <section className="project-task-interaction"><strong>{question || "This task needs your input"}</strong>{choices.length ? <div>{choices.map((choice, index) => <button className={index === 0 ? "primary" : undefined} disabled={disabled} key={choice} onClick={() => onRespond(choice)} type="button">{choice}</button>)}</div> : null}{asksForTextInput(text) ? <form onSubmit={(event) => { event.preventDefault(); if (response.trim()) onRespond(response.trim()); }}><input aria-label="Project task response" onChange={(event) => setResponse(event.target.value)} placeholder="Write a response" value={response} /><button className="primary" disabled={disabled || !response.trim()} type="submit">Send</button></form> : null}</section>;
}

function ProjectTaskApproval({ approval, onAnswer }: { approval: { command: string; reason: string }; onAnswer: (decision: "accept" | "decline") => Promise<void> }) {
  return <section className="project-task-interaction project-task-approval"><strong>Approval required</strong><p>{approval.reason}</p><code>{approval.command}</code><div><button onClick={() => void onAnswer("decline")} type="button">Decline</button><button className="primary" onClick={() => void onAnswer("accept")} type="button">Approve</button></div></section>;
}

function resultStatus(report: string): "awaiting-input" | "completed" { return actionChoicesFrom(report).length || asksForTextInput(report) ? "awaiting-input" : "completed"; }

function ProjectTaskForwardDialog({ onClose, sourceWorkspacePath, task, workspaces }: { onClose: () => void; sourceWorkspacePath: string; task: ProjectTask; workspaces: DesktopWorkspace[] }) {
  const targets = workspaces.filter((workspace) => workspace.path !== sourceWorkspacePath);
  const [target, setTarget] = useState(targets[0]?.path ?? "");
  const [saving, setSaving] = useState(false);
  async function copy() { if (!target) return; setSaving(true); try { await desktopClient.copyProjectTaskToWorkspace(task.id, target); onClose(); } finally { setSaving(false); } }
  return <div aria-modal="true" className="project-task-create-modal" role="dialog"><form onSubmit={(event) => { event.preventDefault(); void copy(); }}><header><div><strong>Copy project task</strong><p>Save a new copy in another registered project. Queue history stays with this project.</p></div><button aria-label="Close copy project task dialog" onClick={onClose} type="button"><X size={17} /></button></header><label>Task</label><output>{task.title}</output><label>Destination project</label><select disabled={!targets.length} onChange={(event) => setTarget(event.target.value)} value={target}>{targets.length ? targets.map((workspace) => <option key={workspace.path} value={workspace.path}>{workspace.name} · {workspace.path}</option>) : <option>No other registered projects</option>}</select><footer><button onClick={onClose} type="button">Cancel</button><button className="primary" disabled={!target || saving} type="submit">{saving ? "Copying…" : "Copy task"}</button></footer></form></div>;
}

function TaskEditor({ editing, form, onChange, onClose, onSave, skills }: { editing: boolean; form: Form; onChange: (form: Form) => void; onClose: () => void; onSave: () => void; skills: ProjectSkill[] }) { return <div aria-modal="true" className="project-task-create-modal" role="dialog"><form onSubmit={(event) => { event.preventDefault(); onSave(); }}><header><div><strong>{editing ? "Edit project task" : "Add project task"}</strong><p>Project tasks are reusable schedule rules. They do not create an isolated Task Runner task.</p></div><button aria-label="Close project task editor" onClick={onClose} type="button"><X size={17} /></button></header><label>Title</label><input autoFocus maxLength={180} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder="Ask to review project health" value={form.title} /><label>Instructions</label><textarea onChange={(event) => onChange({ ...form, instructions: event.target.value })} placeholder="Review project health, open risks, and required follow-up actions." rows={5} value={form.instructions} /><label>Schedule</label><select onChange={(event) => onChange({ ...form, schedule: event.target.value as ProjectTask["schedule"] })} value={form.schedule}>{schedules.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><label>Agent and model</label><select onChange={(event) => onChange({ ...form, model: event.target.value })} value={form.model}>{agents.map((agent) => <option key={agent.value} value={agent.value}>{agent.label}</option>)}</select><label>Project skill <small>Read from the registered assist skill folder or file.</small></label><select onChange={(event) => onChange({ ...form, skillPath: event.target.value || undefined })} value={form.skillPath ?? ""}><option value="">No bound skill</option>{skills.map((skill) => <option key={skill.path} value={skill.path}>{skill.id} · {skill.path}</option>)}</select><footer><button onClick={onClose} type="button">Cancel</button><button className="primary" disabled={!form.instructions.trim()} type="submit">{editing ? "Save changes" : "Add project task"}</button></footer></form></div>; }

function normalizeTitle(value: string) { const normalized = value.replace(/\s+/g, " ").trim(); return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177).trimEnd()}...`; }
function scheduleLabel(schedule: ProjectTask["schedule"]) { return schedules.find((item) => item.value === schedule)?.label ?? "Manual"; }
function normalizeAgent(agent: string) { return agent === "gpt-5.6-terra" ? "codex:gpt-5.6-terra" : agent === "gpt-5.6-luna" ? "codex:gpt-5.6-luna" : agent; }
function skillName(path: string) { return path.split(/[\\/]/).at(-2) ?? path; }
function taskIcon(title: string) { return /github|commit|push/i.test(title) ? GitBranch : /lint|check|test/i.test(title) ? Wrench : ScrollText; }
function taskLogLabel(title: string) { return /github|commit|push/i.test(title) ? "GitHub project control" : /lint|check|test/i.test(title) ? "Quality check control" : "Release log control"; }
function formatTimestamp(value: string) { return new Date(`${value.replace(" ", "T")}Z`).toLocaleString(); }
function isNEOTWorkspace(path: string) { return /[\\/]neot$/i.test(path.trim()); }
function neotProjectTasks(skills: ProjectSkill[]) { const skillPath = (id: string) => skills.find((skill) => skill.id === id)?.path; return [
  { title: "Log → Write changelog with version update", instructions: "Collect the current version, newest changelog entry, changed paths, and migrations. Propose the release note and verification checklist. Request approval before writing the changelog or bumping the version.", schedule: "on-version-update" as const, agentModel: "opencode:nemotron-3-ultra-free", skillPath: skillPath("neot-release-log") },
  { title: "GitHub now → Commit, pull, and push to cloud GitHub", instructions: "Inspect Git state and the configured remote. Prepare the exact pull, commit, and push plan. Require explicit approval before any commit, pull, or push.", schedule: "manual" as const, agentModel: "opencode:nemotron-3-ultra-free", skillPath: skillPath("neot-github-now") },
  { title: "GitHub → Publish NEOT Desktop release", instructions: "Inspect the approved release scope and current desktop version. Prepare a release plan and evidence checklist. Require explicit approval before tags, GitHub release publication, or upload.", schedule: "manual" as const, agentModel: "opencode:nemotron-3-ultra-free", skillPath: skillPath("neot-github-desktop-release") },
  { title: "Deploy Cloud VPS → latest approved NEOT version", instructions: "Inspect the approved release evidence and deployment target. Prepare a production-update plan. Require explicit approval before changing the VPS or deployment state.", schedule: "manual" as const, agentModel: "opencode:nemotron-3-ultra-free", skillPath: skillPath("neot-production-update") }
]; }
