import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BotIcon, CheckCircle2Icon, CircleDotDashedIcon, GitForkIcon, PlayIcon, RotateCcwIcon, SaveIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  assignAgentSupervisor, assignAgentTaskDelegate, createStarterAgentTeam, getAgentTaskGraph,
  listAgentPersonas, resolveAgentIdeApproval, reviewAgentTaskGraph, saveAgentTaskGraph,
  startAgentTask, updateAgentPersona
} from "./agent-ide.services";
import type { AgentPersona, AgentRunDetail, AgentTaskGraph } from "./agent-ide.types";

type Mutate = (action: () => Promise<unknown>) => void;

export function AgentIdeTaskGraph({ run }: { run: AgentRunDetail }) {
  const queryClient = useQueryClient();
  const queryKey = ["neot", "agent-task-graph", run.uuid];
  const graphQuery = useQuery({ queryFn: () => getAgentTaskGraph(run.uuid), queryKey, refetchInterval: 2_000 });
  const personasQuery = useQuery({ queryFn: listAgentPersonas, queryKey: ["neot", "agent-personas"] });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["neot", "agent-personas"] }),
      queryClient.invalidateQueries({ queryKey: ["neot", "agent-run", run.uuid] })
    ]);
  };
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onError: (error) => toast.error(error instanceof Error ? error.message : "The Agent team action failed."),
    onSuccess: refresh
  });
  const graph = graphQuery.data;
  const personas = personasQuery.data ?? [];
  if (!graph) return null;
  const supervisor = personas.find((persona) => persona.role === "supervisor") ?? null;
  return (
    <section className="grid gap-4">
      <AgentTeam busy={mutation.isPending} mutate={mutation.mutate} personas={personas} />
      {!graph.tasks.length ? (
        <section className="rounded-lg border border-dashed p-3">
          <Title />
          <p className="pt-2 text-xs leading-5 text-muted-foreground">Split this run into isolated tasks, then call each named Agent by assignment.</p>
          <button className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50" disabled={!personas.length || mutation.isPending} onClick={() => mutation.mutate(() => saveAgentTaskGraph(run.uuid, starterTasks(run, personas, supervisor), supervisor?.uuid ?? null))} type="button">Create supervised task graph</button>
        </section>
      ) : <TaskGraph graph={graph} mutate={mutation.mutate} personas={personas} run={run} />}
    </section>
  );
}

function AgentTeam({ busy, mutate, personas }: { busy: boolean; mutate: Mutate; personas: AgentPersona[] }) {
  return (
    <section className="rounded-lg border p-3">
      <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><UsersIcon className="size-3.5" /> Named Agent team</h3>
      {!personas.length ? <><p className="pt-2 text-xs leading-5 text-muted-foreground">Create one supervisor and specialized delegates. Rename each Agent before assignment.</p><button className="mt-3 w-full rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50" disabled={busy} onClick={() => mutate(createStarterAgentTeam)} type="button">Create starter team</button></> : <div className="grid gap-2 pt-3">{personas.map((persona) => <PersonaNameEditor key={persona.uuid} mutate={mutate} persona={persona} />)}</div>}
    </section>
  );
}

function PersonaNameEditor({ mutate, persona }: { mutate: Mutate; persona: AgentPersona }) {
  const [name, setName] = useState(persona.name);
  useEffect(() => setName(persona.name), [persona.name]);
  const changed = name.trim().length >= 2 && name.trim() !== persona.name;
  return <div className="flex items-center gap-2">{persona.role === "supervisor" ? <ShieldCheckIcon className="size-3.5 shrink-0 text-primary" /> : <BotIcon className="size-3.5 shrink-0 text-muted-foreground" />}<input aria-label={`Name ${persona.key}`} className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-xs" maxLength={80} onChange={(event) => setName(event.target.value)} value={name} /><button aria-label={`Save ${persona.key} name`} className="rounded border p-1 disabled:opacity-30" disabled={!changed} onClick={() => mutate(() => updateAgentPersona({ ...persona, name: name.trim() }))} type="button"><SaveIcon className="size-3" /></button></div>;
}

function TaskGraph({ graph, mutate, personas, run }: { graph: AgentTaskGraph; mutate: Mutate; personas: AgentPersona[]; run: AgentRunDetail }) {
  const complete = graph.tasks.every((task) => task.status === "completed");
  return (
    <section>
      <div className="flex items-center justify-between gap-2"><Title /><span className="text-xs text-muted-foreground">{graph.tasks.filter((task) => task.status === "completed").length}/{graph.tasks.length}</span></div>
      <label className="grid gap-1 pt-3 text-[11px] text-muted-foreground">Supervisor<select className="rounded border bg-background px-2 py-1.5 text-xs text-foreground" onChange={(event) => mutate(() => assignAgentSupervisor(run.uuid, event.target.value))} value={graph.supervisor?.uuid ?? ""}><option disabled value="">Select supervisor</option>{personas.filter((persona) => persona.role === "supervisor").map((persona) => <option key={persona.uuid} value={persona.uuid}>{persona.name}</option>)}</select></label>
      <div className="grid gap-2 pt-3">{graph.tasks.map((task) => <TaskCard key={task.uuid} mutate={mutate} personas={personas} task={task} />)}</div>
      {complete ? <div className="grid grid-cols-2 gap-2 pt-3"><button className="rounded-md border px-2 py-2 text-xs hover:bg-muted" onClick={() => mutate(() => reviewAgentTaskGraph(run.uuid, "rework", `${graph.supervisor?.name ?? "Supervisor"} requested another task pass.`))} type="button"><RotateCcwIcon className="mr-1 inline size-3" /> Rework</button><button className="rounded-md bg-primary px-2 py-2 text-xs text-primary-foreground" onClick={() => mutate(() => reviewAgentTaskGraph(run.uuid, "approved", `${graph.supervisor?.name ?? "Supervisor"} reviewed all completed delegate tasks.`))} type="button"><CheckCircle2Icon className="mr-1 inline size-3" /> Human approve</button></div> : null}
    </section>
  );
}

function TaskCard({ mutate, personas, task }: { mutate: Mutate; personas: AgentPersona[]; task: AgentTaskGraph["tasks"][number] }) {
  const assignable = personas.filter((persona) => persona.agentProfile === task.agentProfile && (persona.role === "delegate" || task.agentProfile === "review"));
  return (
    <article className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-semibold">{task.sequence}. {task.title}</p><p className="pt-1 text-[11px] text-muted-foreground">{task.delegate?.name ?? "Unassigned"} · {task.agentProfile} · {task.status}</p></div><TaskAction mutate={mutate} task={task} /></div>
      {(task.status === "blocked" || task.status === "ready") ? <select aria-label={`Delegate for ${task.title}`} className="mt-2 w-full rounded border bg-background px-2 py-1 text-xs" onChange={(event) => mutate(() => assignAgentTaskDelegate(task.uuid, event.target.value))} value={task.delegate?.uuid ?? ""}><option value="">Assign named Agent</option>{assignable.map((persona) => <option key={persona.uuid} value={persona.uuid}>{persona.name} · {persona.agentProfile}</option>)}</select> : null}
      <div className="flex flex-wrap gap-1 pt-2">{task.scopePaths.map((path) => <span className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]" key={path}>{path}</span>)}</div>
      {task.pendingApproval ? <ApprovalAction approval={task.pendingApproval} mutate={mutate} /> : null}
      {task.resultSummary ? <p className="line-clamp-3 pt-2 text-[11px] leading-4 text-muted-foreground">{task.resultSummary}</p> : null}
    </article>
  );
}

function TaskAction({ mutate, task }: { mutate: Mutate; task: AgentTaskGraph["tasks"][number] }) {
  if (task.status === "ready") return <button aria-label={`Call ${task.delegate?.name ?? "delegate"} for ${task.title}`} className="rounded border p-1 hover:bg-muted disabled:opacity-30" disabled={!task.delegate} onClick={() => mutate(() => startAgentTask(task.uuid))} title={task.delegate ? `Call ${task.delegate.name}` : "Assign a delegate first"} type="button"><PlayIcon className="size-3" /></button>;
  if (task.status === "running") return <CircleDotDashedIcon className="size-4 animate-pulse text-primary" />;
  return task.status === "completed" ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : <CircleDotDashedIcon className="size-4 text-muted-foreground" />;
}

function ApprovalAction({ approval, mutate }: { approval: NonNullable<AgentTaskGraph["tasks"][number]["pendingApproval"]>; mutate: Mutate }) {
  return <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/5 p-2"><p className="text-[11px] leading-4">{approval.reason}</p><div className="grid grid-cols-2 gap-2 pt-2"><button className="rounded border px-2 py-1 text-[11px]" onClick={() => mutate(() => resolveAgentIdeApproval({ decision: "decline", requestId: approval.requestId, threadId: approval.threadId }))} type="button">Decline</button><button className="rounded bg-primary px-2 py-1 text-[11px] text-primary-foreground" onClick={() => mutate(() => resolveAgentIdeApproval({ decision: "accept", requestId: approval.requestId, threadId: approval.threadId }))} type="button">Approve once</button></div></div>;
}

function Title() { return <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><GitForkIcon className="size-3.5" /> Task graph</h3>; }

function starterTasks(run: AgentRunDetail, personas: AgentPersona[], supervisor: AgentPersona | null) {
  const find = (key: string) => personas.find((persona) => persona.key === key)?.uuid ?? null;
  return [
    { agentProfile: "planning", delegatePersonaUuid: find("scout"), dependsOn: [], key: "inspect", objective: `Inspect the repository evidence for: ${run.objective}`, scopePaths: ["assist/", "README.md"], title: "Inspect and refine scope" },
    { agentProfile: "coding", delegatePersonaUuid: find("forge"), dependsOn: ["inspect"], key: "backend", objective: "Implement the module-owned API and persistence slice.", scopePaths: ["apps/neot/api/"], title: "Build backend slice" },
    { agentProfile: "coding", delegatePersonaUuid: find("canvas"), dependsOn: ["inspect"], key: "frontend", objective: "Implement the Project Agent visual workflow.", scopePaths: ["apps/neot/web/"], title: "Build frontend slice" },
    { agentProfile: "review", delegatePersonaUuid: supervisor?.uuid ?? null, dependsOn: ["backend", "frontend"], key: "review", objective: "Review delegate evidence, run focused checks, and report integration risks.", scopePaths: ["apps/neot/", "test/", "tools/e2e/"], title: "Supervisor verification" }
  ];
}
