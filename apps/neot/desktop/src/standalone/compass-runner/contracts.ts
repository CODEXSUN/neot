/**
 * Compass Runner is an intentionally unregistered prototype. It has no NEOT
 * shell, database, Tauri, or existing task-runner dependencies.
 */

export type CompassRunStatus = "draft" | "planning" | "awaiting-approval" | "running" | "awaiting-input" | "completed" | "failed" | "cancelled";
export type CompassInput = { kind: "text" | "image" | "document" | "audio"; name: string; value: string };
export type CompassArtifact = { name: string; mediaType: string; uri: string };
export type CompassApproval = { id: string; summary: string; risk: "low" | "medium" | "high"; actions: readonly ["approve", "decline"] };
export type CompassInteraction = { id: string; question: string; choices?: readonly string[]; acceptsText: boolean };
export type CompassEvent = { at: string; type: "planned" | "log" | "approval-requested" | "input-requested" | "completed" | "failed" | "cancelled"; message: string };

export type CompassTask = {
  id: string;
  title: string;
  objective: string;
  inputs: readonly CompassInput[];
  adapter: "codex" | "opencode" | "openhands" | "ollama" | "simulated";
};

export type CompassExecutionContext = {
  task: CompassTask;
  approved?: boolean;
  response?: string;
};

export type CompassDirective =
  | { kind: "approval"; approval: CompassApproval; log: string }
  | { kind: "interaction"; interaction: CompassInteraction; log: string }
  | { kind: "result"; summary: string; artifacts?: readonly CompassArtifact[]; log: string }
  | { kind: "failure"; message: string; log: string };

export interface CompassExecutorAdapter {
  readonly id: CompassTask["adapter"];
  execute(context: CompassExecutionContext): Promise<CompassDirective>;
}

export type CompassSnapshot = {
  task: CompassTask;
  status: CompassRunStatus;
  events: readonly CompassEvent[];
  approval?: CompassApproval;
  interaction?: CompassInteraction;
  result?: string;
  artifacts: readonly CompassArtifact[];
  error?: string;
};
