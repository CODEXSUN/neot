const DEFAULT_HEARTBEAT_MS = 60_000;

export class WorkflowProgressReporter {
  constructor({ heartbeatMs = DEFAULT_HEARTBEAT_MS, log = console.log, now = Date.now } = {}) {
    this.heartbeatMs = heartbeatMs;
    this.log = log;
    this.now = now;
    this.lastKey = "";
    this.lastLogAt = 0;
    this.latest = undefined;
  }

  report(run, jobsResponse) {
    const currentTime = this.now();
    const progress = workflowProgress(run, jobsResponse, currentTime);
    const changed = progress.key !== this.lastKey;
    const heartbeatDue = currentTime - this.lastLogAt >= this.heartbeatMs;
    this.latest = progress;
    if (!changed && !heartbeatDue) return progress;
    this.log(progress.line);
    if (changed && progress.url) this.log(`Active job: ${progress.url}`);
    this.lastKey = progress.key;
    this.lastLogAt = currentTime;
    return progress;
  }

  timeoutMessage(fallbackUrl) {
    const detail = this.latest?.label ? ` Last active step: ${this.latest.label}.` : "";
    return `Timed out waiting for the desktop release workflow.${detail} ${this.latest?.url ?? fallbackUrl}`;
  }
}

export function workflowProgress(run, jobsResponse, now = Date.now()) {
  const jobs = jobsResponse?.jobs ?? [];
  const activeJob =
    jobs.find((job) => job.status === "in_progress") ??
    jobs.find((job) => job.status === "queued") ??
    jobs.at(-1);
  const activeStep =
    activeJob?.steps?.find((step) => step.status === "in_progress") ??
    activeJob?.steps?.find((step) => step.status === "queued") ??
    activeJob?.steps?.at(-1);
  const status = run.conclusion || run.status;
  const label = activeStep?.name ?? activeJob?.name ?? "Waiting for a GitHub runner";
  const stepStartedAt = activeStep?.started_at ?? activeJob?.started_at ?? run.run_started_at;
  const runStartedAt = run.run_started_at ?? run.created_at;
  const stepElapsed = elapsedSince(stepStartedAt, now);
  const totalElapsed = elapsedSince(runStartedAt, now);
  return {
    key: `${status}:${activeJob?.id ?? "run"}:${activeStep?.number ?? label}`,
    label,
    line: `Desktop release workflow: ${status} · ${label} · step ${stepElapsed} · total ${totalElapsed}`,
    url: activeJob?.html_url ?? run.html_url
  };
}

export function formatElapsed(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  if (hours) return `${hours}h ${minutes}m ${remainder}s`;
  if (minutes) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

function elapsedSince(value, now) {
  const startedAt = Date.parse(value ?? "");
  return formatElapsed(Number.isFinite(startedAt) ? now - startedAt : 0);
}
