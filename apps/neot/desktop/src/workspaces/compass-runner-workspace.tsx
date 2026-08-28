import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Check, Copy, ExternalLink, FileOutput, History, ShieldCheck, StopCircle } from "lucide-react";
import type { CompassReleaseEvent } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

type ReleasePhase = "idle" | "version-bump" | "commit-push" | "publish-release" | "completed" | "stopped" | "failed";
type StageId = "preflight" | "version" | "commit" | "publish";
type StageStatus = "pending" | "running" | "awaiting-approval" | "completed" | "failed";
type Session = { id: string; startedAt: string; endedAt?: string; phase: ReleasePhase; stages: Record<StageId, StageStatus>; events: CompassReleaseEvent[]; error?: string };
type Action = "inspect" | "validate" | "version-bump" | "commit-push" | "publish-release";

const sessionKey = "neot.compass-release-session";
const historyKey = "neot.compass-release-history";
const stages: readonly { id: StageId; label: string }[] = [{ id: "preflight", label: "Preflight" }, { id: "version", label: "Version and changelog" }, { id: "commit", label: "Commit and push" }, { id: "publish", label: "Publish and verify" }];

export function CompassRunnerWorkspace() {
  return <section className="compass-runner" aria-label="Compass Runner standalone release control">
    <header className="compass-header"><div><p className="compass-eyebrow">Standalone release worker</p><h1>Compass Runner</h1><p>Release preflight, approvals, live console output, and verified release evidence for this repository.</p></div></header>
    <div className="compass-layout"><aside className="compass-context"><h2>Prepare NEOT IDE release</h2><p>Each protected repository mutation needs approval. The runner records its evidence locally and does not complete until GitHub release verification succeeds.</p><dl><div><dt>Adapter</dt><dd>Repository release worker</dd></div><div><dt>Inputs</dt><dd>Git state, release notes, checks, workflow, and assets</dd></div></dl><h3>Evidence</h3><ul><li><FileOutput size={15} /><span><strong>Release history</strong><small>Local desktop record</small></span></li><li><FileOutput size={15} /><span><strong>GitHub release</strong><small>Public verification</small></span></li></ul></aside><main className="compass-run"><ReleaseWorker /></main></div>
  </section>;
}

function ReleaseWorker() {
  const [session, setSession] = useState<Session>(() => readSession());
  const [history, setHistory] = useState<Session[]>(() => readHistory());
  const [busy, setBusy] = useState(false);
  const ref = useRef(session);
  const seenEvents = useRef(new Set<string>());
  const { events, phase, stages: status } = session;
  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    void listen<CompassReleaseEvent>("compass-release-event", (event) => {
      const fingerprint = JSON.stringify(event.payload);
      if (seenEvents.current.has(fingerprint)) return;
      seenEvents.current.add(fingerprint);
      update((current) => ({ ...current, events: [...current.events, event.payload] }));
    }).then((cleanup) => {
      if (active) unlisten = cleanup;
      else cleanup();
    });
    return () => { active = false; unlisten?.(); };
  }, []);
  function update(change: (current: Session) => Session) { const next = change(ref.current); ref.current = next; saveSession(next); setSession(next); }
  function begin() { const next = createSession(); ref.current = next; saveSession(next); setSession(next); }
  function setStage(stage: StageId, value: StageStatus) { update((current) => ({ ...current, stages: { ...current.stages, [stage]: value } })); }
  function approve(next: "version-bump" | "commit-push" | "publish-release") { update((current) => ({ ...current, phase: next, stages: { ...current.stages, [stageFor(next)]: "awaiting-approval" } })); }
  function record(nextPhase: "completed" | "failed" | "stopped", error?: string) { const next = { ...ref.current, phase: nextPhase, endedAt: new Date().toISOString(), ...(error ? { error } : {}) }; ref.current = next; saveSession(next); const nextHistory = [next, ...history.filter((item) => item.id !== next.id)].slice(0, 12); saveHistory(nextHistory); setHistory(nextHistory); setSession(next); }
  async function execute(action: Action, stage: StageId) { seenEvents.current.clear(); setBusy(true); setStage(stage, "running"); try { await desktopClient.runCompassReleaseStep(action, "Compass Runner live release flow"); setStage(stage, "completed"); return true; } catch (cause) { const error = cause instanceof Error ? cause.message : String(cause); setStage(stage, "failed"); record("failed", error); return false; } finally { setBusy(false); } }
  async function start() { begin(); if (!await execute("inspect", "preflight")) return; if (!await execute("validate", "preflight")) return; approve("version-bump"); }
  async function continueRun() { if (phase === "version-bump") { if (await execute("version-bump", "version")) approve("commit-push"); } else if (phase === "commit-push") { if (await execute("commit-push", "commit")) approve("publish-release"); } else if (phase === "publish-release" && await execute("publish-release", "publish") && ref.current.phase === "publish-release") record("completed"); }
  function stopMonitoring() { record("stopped", "Monitoring was closed locally. The remote release workflow was not cancelled."); }
  const report = makeReport(session);
  const { releaseUrl, workflowUrl } = report;
  const isApproval = isApprovalPhase(phase) && status[stageFor(phase)] === "awaiting-approval";
  return <section className="compass-live"><header><div><p>Live release execution</p><h2>{phase === "completed" ? "Release evidence verified" : "Ready for repository preflight"}</h2></div><span className={`compass-status ${phase}`}>{label(phase)}</span></header>
    <p className="compass-runner-summary">Publication remains running until GitHub succeeds and the required public assets are verified.</p>
    <ol className="compass-release-stages" aria-label="Release stage status">{stages.map((stage) => <li className={status[stage.id]} key={stage.id}><strong>{stage.label}</strong><span>{label(status[stage.id])}</span></li>)}</ol>
    <div className="compass-actions"><button className="compass-release-start" disabled={busy} onClick={() => void start()} type="button">{busy ? "Running release stage…" : "Run release process"}</button><button disabled={busy} onClick={() => void execute("inspect", "preflight")} type="button">Inspect repository</button><button disabled={busy} onClick={() => void execute("validate", "preflight")} type="button">Run checks</button>{workflowUrl ? <button onClick={() => openLink(workflowUrl)} type="button"><ExternalLink size={14} /> Open workflow</button> : null}<button onClick={() => void copyText(report.text)} type="button"><Copy size={14} /> Copy report</button>{phase === "publish-release" && busy ? <button onClick={stopMonitoring} type="button"><StopCircle size={14} /> Stop monitoring</button> : null}</div>
    {isApproval ? <section className="compass-decision"><ShieldCheck size={19} /><div><strong>Live approval required</strong><p>{approvalText(phase)}</p><footer><button onClick={stopMonitoring} type="button">Stop process</button><button className="compass-primary" disabled={busy} onClick={() => void continueRun()} type="button">Approve and continue</button></footer></div></section> : null}
    {phase === "completed" ? <section className="compass-result"><Check size={19} /><div><strong>Release published and verified</strong><p>{report.text}</p>{releaseUrl ? <button onClick={() => openLink(releaseUrl)} type="button">Open release <ExternalLink size={14} /></button> : null}</div></section> : null}
    {phase === "failed" || phase === "stopped" ? <p className="compass-error">{session.error ?? "Release monitoring stopped."}</p> : null}
    <section className="compass-console"><header><strong>Live console</strong><span>{events.length} events</span></header><ol className="compass-log">{events.map((event, index) => <li key={`${event.kind}-${index}`}><time>{event.kind}</time><span>{event.message}</span></li>)}</ol></section>
    <section className="compass-history"><header><History size={16} /><strong>Previous runs</strong></header>{history.length ? <ol>{history.map((item) => <li key={item.id}><span>{label(item.phase)}</span><time>{new Date(item.startedAt).toLocaleString()}</time><button onClick={() => restore(item)} type="button">View</button></li>)}</ol> : <p>No completed Compass runs are saved yet.</p>}</section>
  </section>;
  function restore(item: Session) { ref.current = item; saveSession(item); setSession(item); }
}

function createSession(): Session { return { id: crypto.randomUUID(), startedAt: new Date().toISOString(), phase: "idle", stages: { preflight: "pending", version: "pending", commit: "pending", publish: "pending" }, events: [] }; }
function readSession(): Session {
  const saved = read<Partial<Session>>(sessionKey);
  const fresh = createSession();
  if (!saved?.id || !saved.startedAt || !saved.stages || !Array.isArray(saved.events)) return fresh;
  return { ...fresh, ...saved, stages: { ...fresh.stages, ...saved.stages }, events: saved.events };
}
function readHistory(): Session[] { return read<Session[]>(historyKey) ?? []; }
function read<T>(key: string): T | undefined { if (typeof window === "undefined") return undefined; try { return JSON.parse(window.localStorage.getItem(key) ?? "") as T; } catch { return undefined; } }
function saveSession(session: Session) { if (typeof window !== "undefined") window.localStorage.setItem(sessionKey, JSON.stringify(session)); }
function saveHistory(history: Session[]) { if (typeof window !== "undefined") window.localStorage.setItem(historyKey, JSON.stringify(history)); }
function stageFor(phase: "version-bump" | "commit-push" | "publish-release") { return phase === "version-bump" ? "version" : phase === "commit-push" ? "commit" : "publish"; }
function isApprovalPhase(phase: ReleasePhase): phase is "version-bump" | "commit-push" | "publish-release" { return phase === "version-bump" || phase === "commit-push" || phase === "publish-release"; }
function approvalText(phase: ReleasePhase) { return phase === "version-bump" ? "Write repository version references and release notes." : phase === "commit-push" ? "Synchronise Git, stage reviewed files, commit, and push." : "Create the tag, wait for GitHub, and verify public release assets."; }
function label(value: string) { return value.replaceAll("-", " "); }
function makeReport(session: Session) { const data = [...session.events].reverse().find((event) => event.kind === "result" && event.data)?.data ?? {}; const releaseUrl = text(data.releaseUrl); const workflowUrl = text(data.workflowUrl); const tag = text(data.tag); const commit = text(data.head); return { releaseUrl, workflowUrl, text: session.phase === "completed" ? `Verified ${tag ?? "release"}${commit ? ` at ${commit.slice(0, 12)}` : ""}.` : session.error ?? "Release is awaiting verification." }; }
function text(value: unknown) { return typeof value === "string" ? value : undefined; }
function openLink(url: string) { window.open(url, "_blank", "noopener,noreferrer"); }
async function copyText(value: string) { await navigator.clipboard?.writeText(value); }
