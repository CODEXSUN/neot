import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ActivityIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  Clock3Icon,
  FileCode2Icon,
  FolderGit2Icon,
  GitBranchIcon,
  PanelRightCloseIcon,
  ShieldAlertIcon,
  TerminalSquareIcon,
  XCircleIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cleanupAgentRunWorkspace, getAgentRun, listAgentRuns } from "./agent-ide.services";
import type { AgentRunDetail, AgentRunStatus } from "./agent-ide.types";
import { AgentIdeQualityGates } from "./agent-ide.quality-gates";
import { AgentIdeTaskGraph } from "./agent-ide.task-graph";

export function AgentIdeRunConsole({
  activeRunId,
  onClose,
  projectUuid
}: {
  activeRunId: string | null;
  onClose: () => void;
  projectUuid: string;
}) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(activeRunId);
  const runsQuery = useQuery({
    enabled: Boolean(projectUuid),
    queryFn: () => listAgentRuns(projectUuid),
    queryKey: ["neot", "agent-runs", projectUuid],
    refetchInterval: 2_000
  });
  const runs = runsQuery.data ?? [];

  useEffect(() => {
    if (activeRunId) setSelectedId(activeRunId);
  }, [activeRunId]);
  useEffect(() => {
    if (!selectedId && runs[0]) setSelectedId(runs[0].uuid);
  }, [runs, selectedId]);

  const detailQuery = useQuery({
    enabled: Boolean(selectedId),
    queryFn: () => getAgentRun(selectedId ?? ""),
    queryKey: ["neot", "agent-run", selectedId],
    refetchInterval: 2_000
  });
  const run = detailQuery.data;
  const cleanup = async () => {
    if (!run) return;
    try {
      await cleanupAgentRunWorkspace(run.uuid);
      toast.success("Clean worktree removed. The run branch was preserved.");
      await queryClient.invalidateQueries({ queryKey: ["neot", "agent-run", run.uuid] });
      await queryClient.invalidateQueries({ queryKey: ["neot", "agent-runs", projectUuid] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The worktree could not be cleaned up.");
    }
  };

  return (
    <aside className="hidden w-[22rem] shrink-0 overflow-y-auto border-l bg-background [scrollbar-color:hsl(var(--muted-foreground)/0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1 2xl:block">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="flex items-start gap-2">
          <button
            aria-label="Hide run control"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            title="Hide run control"
            type="button"
          >
            <PanelRightCloseIcon className="size-4" />
          </button>
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><ActivityIcon className="size-4" /> Run control</h2>
            <p className="pt-0.5 text-xs text-muted-foreground">Durable execution and approval evidence</p>
          </div>
          <div className="shrink-0 pt-1">
            {run ? <StatusBadge status={run.status} /> : null}
          </div>
        </div>
      </header>
      {!projectUuid ? <EmptyState text="Select a project to inspect its Agent runs." /> : null}
      {projectUuid && !runs.length ? <EmptyState text="Send a message to create the first durable Agent run." /> : null}
      {run ? (
        <div className="grid gap-5 px-4 pb-4 pt-6">
          <section>
            <p className="line-clamp-3 text-sm font-medium leading-5">{run.objective}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs text-muted-foreground">
              <span>{run.agentProfile}</span><span>{run.model}</span><span>{run.access}</span>
            </div>
          </section>
          <Pipeline status={run.status} />
          <AgentIdeTaskGraph run={run} />
          <WorkspaceEvidence onCleanup={() => void cleanup()} run={run} />
          <AgentIdeQualityGates projectUuid={projectUuid} run={run} />
          <section className="grid grid-cols-3 divide-x rounded-lg border py-3 text-center">
            <Metric label="Steps" value={run.steps.length} />
            <Metric label="Tools" value={run.toolCalls.filter((call) => isToolEvidence(call.name)).length} />
            <Metric label="Files" value={run.artifacts.length} />
          </section>
          {run.approvals.length ? (
            <section>
              <SectionTitle icon={<ShieldAlertIcon />} label="Approvals" />
              <div className="grid gap-2 pt-2">
                {run.approvals.map((approval) => (
                  <div className="rounded-lg border px-3 py-2" key={approval.uuid}>
                    <div className="flex items-center justify-between gap-2 text-xs font-medium">
                      <span>{approval.status}</span><span className="text-muted-foreground">{approval.decision ?? "Waiting"}</span>
                    </div>
                    <p className="line-clamp-2 pt-1 text-xs leading-5 text-muted-foreground">{approval.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <section>
            <SectionTitle icon={<TerminalSquareIcon />} label="Activity" />
            <div className="grid gap-0 pt-2">
              {run.steps.slice(-8).map((step) => (
                <div className="flex gap-3 border-l pb-4 pl-4 last:pb-0" key={step.uuid}>
                  <span className="-ml-[1.31rem] mt-0.5 grid size-3 rounded-full border-2 border-background bg-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{humanize(step.label)}</p>
                    <p className="pt-0.5 text-xs text-muted-foreground">{step.status} · {formatTime(step.startedAt)}</p>
                  </div>
                </div>
              ))}
              {run.steps.length > 8 ? <p className="pb-2 text-xs text-muted-foreground">Showing the latest 8 of {run.steps.length} steps.</p> : null}
              {!run.steps.length ? <p className="text-xs text-muted-foreground">Runtime activity will appear here.</p> : null}
            </div>
          </section>
          {run.artifacts.length ? (
            <section>
              <SectionTitle icon={<FileCode2Icon />} label="Changed files" />
              <div className="grid gap-2 pt-2">
                {run.artifacts.map((artifact) => (
                  <div className="flex min-w-0 items-center gap-2 text-xs" key={artifact.uuid}>
                    <FileCode2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate" title={artifact.path}>{artifact.path}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <section className="border-t pt-4">
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3Icon className="size-3.5" /> {run.completedAt ? "Completed" : "Started"} {formatTime(run.completedAt ?? run.startedAt ?? run.createdAt)}</p>
            <p className="pt-2 text-xs text-muted-foreground">Budget: {run.budget.maxToolCalls} tools · {run.budget.maxFilesChanged} files · {Math.round(run.budget.maxDurationSeconds / 60)} min</p>
          </section>
          {runs.length > 1 ? (
            <section className="border-t pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent runs</p>
              <div className="grid gap-1 pt-2">
                {runs.slice(0, 5).map((item) => (
                  <button className={`rounded-md px-2 py-2 text-left hover:bg-muted ${item.uuid === run.uuid ? "bg-muted" : ""}`} key={item.uuid} onClick={() => setSelectedId(item.uuid)} type="button">
                    <span className="line-clamp-1 text-xs font-medium">{item.objective}</span>
                    <span className="block pt-1 text-xs text-muted-foreground">{item.status} · {formatTime(item.createdAt)}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}

function WorkspaceEvidence({ onCleanup, run }: { onCleanup: () => void; run: AgentRunDetail }) {
  const terminal = ["cancelled", "completed", "failed"].includes(run.status);
  const canCleanup = run.workspaceMode === "worktree" && run.workspaceStatus === "clean" && terminal;
  return (
    <section className="rounded-lg border px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={<FolderGit2Icon />} label="Workspace" />
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${run.workspaceStatus === "changed" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>{run.workspaceStatus}</span>
      </div>
      <div className="grid gap-2 pt-3 text-xs">
        <p className="flex min-w-0 items-center gap-2"><GitBranchIcon className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate">{run.branchName ?? "Source checkout"}</span></p>
        <p className="truncate font-mono text-muted-foreground" title={run.workspacePath ?? run.sourceRoot ?? undefined}>{run.workspacePath ?? run.sourceRoot ?? (terminal ? "Path not recorded for this earlier run" : "Preparing workspace")}</p>
        {run.baseRevision ? <p className="text-muted-foreground">Base {run.baseRevision.slice(0, 10)}</p> : null}
      </div>
      {run.workspaceMode === "worktree" && run.workspaceStatus === "changed" ? <p className="pt-3 text-xs leading-5 text-amber-700 dark:text-amber-400">Changes are retained for review. Commit or resolve them before cleanup.</p> : null}
      {canCleanup ? <button className="mt-3 w-full rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted" onClick={onCleanup} type="button">Remove clean worktree</button> : null}
      {run.workspaceStatus === "cleaned" ? <p className="pt-3 text-xs text-muted-foreground">The worktree was removed. The branch remains available.</p> : null}
    </section>
  );
}

function Pipeline({ status }: { status: AgentRunStatus }) {
  const stages = ["Plan", "Run", "Approve", "Verify", "Done"];
  const index = status === "planning" ? 0 : status === "running" ? 1 : status === "awaiting_approval" ? 2 : status === "completed" ? 4 : 3;
  return <section><div className="flex items-center">{stages.map((stage, position) => <div className="flex flex-1 items-center last:flex-none" key={stage}><span className={`grid size-6 place-items-center rounded-full border text-[10px] ${position <= index ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{position < index || status === "completed" ? <CheckCircle2Icon className="size-3.5" /> : position + 1}</span>{position < stages.length - 1 ? <span className={`h-px flex-1 ${position < index ? "bg-primary" : "bg-border"}`} /> : null}</div>)}</div><div className="flex justify-between pt-1 text-[10px] text-muted-foreground">{stages.map((stage) => <span key={stage}>{stage}</span>)}</div></section>;
}

function StatusBadge({ status }: { status: AgentRunStatus }) {
  const failed = status === "failed" || status === "cancelled";
  const Icon = failed ? XCircleIcon : status === "completed" ? CheckCircle2Icon : CircleDashedIcon;
  return <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${failed ? "bg-destructive/10 text-destructive" : status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}><Icon className="size-3.5" /> {status.replaceAll("_", " ")}</span>;
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) { return <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><span className="[&_svg]:size-3.5">{icon}</span>{label}</h3>; }
function Metric({ label, value }: { label: string; value: number }) { return <div><strong className="block text-lg leading-5">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div>; }
function EmptyState({ text }: { text: string }) { return <div className="grid min-h-56 place-items-center px-8 text-center text-sm leading-6 text-muted-foreground">{text}</div>; }
function formatTime(value: string | null) { return value ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "Pending"; }
function humanize(value: string) { return value.replace(/([a-z])([A-Z])/gu, "$1 $2").replaceAll("_", " "); }
function isToolEvidence(value: string) { return /command|fileChange|mcpTool|webSearch/iu.test(value); }
