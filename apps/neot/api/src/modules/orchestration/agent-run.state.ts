import { AppError } from "@neot/framework/errors";

export type AgentRunStatus =
  | "awaiting_approval"
  | "cancelled"
  | "completed"
  | "failed"
  | "planning"
  | "running";

const transitions: Record<AgentRunStatus, AgentRunStatus[]> = {
  awaiting_approval: ["cancelled", "failed", "running"],
  cancelled: [],
  completed: [],
  failed: [],
  planning: ["cancelled", "failed", "running"],
  running: ["awaiting_approval", "cancelled", "completed", "failed"]
};

export function assertAgentRunTransition(current: string, next: AgentRunStatus) {
  if (current === next) return;
  if (isAgentRunStatus(current) && transitions[current].includes(next)) return;
  throw new AppError({
    code: "INVALID_AGENT_RUN_TRANSITION",
    message: `Agent run cannot move from ${current} to ${next}.`,
    statusCode: 409
  });
}

export function isTerminalAgentRunStatus(status: string) {
  return status === "cancelled" || status === "completed" || status === "failed";
}

function isAgentRunStatus(value: string): value is AgentRunStatus {
  return value in transitions;
}
