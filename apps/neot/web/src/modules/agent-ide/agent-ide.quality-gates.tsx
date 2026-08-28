import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, GitCommitHorizontalIcon, RotateCcwIcon, ShieldCheckIcon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { commitAgentRun, requestAgentRunRework, verifyAgentRun } from "./agent-ide.services";
import type { AgentRunDetail } from "./agent-ide.types";

export function AgentIdeQualityGates({ projectUuid, run }: { projectUuid: string; run: AgentRunDetail }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [confirmCommit, setConfirmCommit] = useState(false);
  const [commitMessage, setCommitMessage] = useState(`Agent: ${run.objective.slice(0, 72)}`);
  const worktreeAvailable = run.workspaceMode === "worktree" && run.workspaceStatus !== "cleaned";
  const terminal = ["cancelled", "completed", "failed"].includes(run.status);
  const canVerify = terminal && worktreeAvailable && !run.commitHash;
  const canCommit = run.status === "completed" && run.verificationStatus === "passed" && run.reviewStatus === "ready_for_review" && worktreeAvailable;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["neot", "agent-run", run.uuid] });
    await queryClient.invalidateQueries({ queryKey: ["neot", "agent-runs", projectUuid] });
  };

  const verify = async () => {
    setBusy(true);
    try {
      const result = await verifyAgentRun(run.uuid);
      toast[result.passed ? "success" : "error"](result.passed ? "All required quality gates passed." : "A required quality gate failed.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification could not run.");
    } finally {
      setBusy(false);
    }
  };

  const requestRework = async () => {
    setBusy(true);
    try {
      await requestAgentRunRework(run.uuid, "Address the failed or reviewed quality gates, then submit a new Agent run.");
      toast.success("The run was returned for rework.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rework could not be requested.");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    setBusy(true);
    try {
      const result = await commitAgentRun(run.uuid, commitMessage);
      toast.success(`Commit ${result.commitHash.slice(0, 10)} created. No remote push was made.`);
      setConfirmCommit(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The commit could not be created.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <ShieldCheckIcon className="size-3.5" /> Quality gates
        </h3>
        <GateStatus status={run.verificationStatus} />
      </div>
      <div className="grid gap-2 pt-3">
        {latestAttempt(run).map((result) => (
          <div className="flex items-start gap-2" key={result.uuid}>
            {result.status === "passed" ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{result.label}</p>
              <p className="pt-0.5 text-xs text-muted-foreground">{result.status} · {formatDuration(result.durationMs)}{result.required ? " · required" : ""}</p>
            </div>
          </div>
        ))}
        {!run.verifications.length ? <p className="text-xs leading-5 text-muted-foreground">Run the registered checks before integration.</p> : null}
      </div>
      {canVerify ? <button className="mt-3 w-full rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50" disabled={busy} onClick={() => void verify()} type="button"><ShieldCheckIcon className="mr-2 inline size-3.5" />{busy ? "Running checks…" : "Run quality gates"}</button> : null}
      {run.verificationStatus === "failed" && run.reviewStatus !== "rework_required" ? <button className="mt-2 w-full rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted" disabled={busy} onClick={() => void requestRework()} type="button"><RotateCcwIcon className="mr-2 inline size-3.5" />Return for rework</button> : null}
      {canCommit && !confirmCommit ? <button className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground" onClick={() => setConfirmCommit(true)} type="button"><GitCommitHorizontalIcon className="mr-2 inline size-3.5" />Review commit</button> : null}
      {confirmCommit ? (
        <div className="mt-3 grid gap-2 border-t pt-3">
          <p className="text-xs leading-5">This creates a local commit on <strong>{run.branchName}</strong>. It does not push.</p>
          <input aria-label="Commit message" className="h-9 rounded-md border bg-background px-3 text-xs" maxLength={240} onChange={(event) => setCommitMessage(event.target.value)} value={commitMessage} />
          <div className="flex gap-2">
            <button className="flex-1 rounded-md border px-3 py-2 text-xs" onClick={() => setConfirmCommit(false)} type="button">Cancel</button>
            <button className="flex-1 rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50" disabled={busy || commitMessage.trim().length < 3} onClick={() => void commit()} type="button">Approve commit</button>
          </div>
        </div>
      ) : null}
      {run.commitHash ? <p className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400"><GitCommitHorizontalIcon className="size-3.5" />Committed {run.commitHash.slice(0, 10)}. No remote push.</p> : null}
    </section>
  );
}

function GateStatus({ status }: { status: string }) {
  return <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{status.replaceAll("_", " ")}</span>;
}

function latestAttempt(run: AgentRunDetail) {
  const attempt = Math.max(0, ...run.verifications.map((result) => result.attempt));
  return run.verifications.filter((result) => result.attempt === attempt);
}

function formatDuration(value: number) {
  return value < 1_000 ? `${value}ms` : `${(value / 1_000).toFixed(1)}s`;
}
