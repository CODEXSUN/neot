export type AgentRunBudget = {
  maxDurationSeconds: number;
  maxFilesChanged: number;
  maxSubAgents: number;
  maxToolCalls: number;
};

export const defaultAgentRunBudget: AgentRunBudget = {
  maxDurationSeconds: 1_800,
  maxFilesChanged: 50,
  maxSubAgents: 4,
  maxToolCalls: 100
};

export class AgentRunBudgetGuard {
  private readonly deadline: number;
  private readonly files = new Set<string>();
  private subAgents = 0;
  private toolCalls = 0;

  constructor(
    private readonly budget: AgentRunBudget = defaultAgentRunBudget,
    startedAt = Date.now()
  ) {
    this.deadline = startedAt + budget.maxDurationSeconds * 1_000;
  }

  remainingDurationMs() {
    return Math.max(0, this.deadline - Date.now());
  }

  observeActivity(label: string) {
    if (isToolActivity(label)) this.toolCalls += 1;
    if (isSubAgentActivity(label)) this.subAgents += 1;
    return this.violation();
  }

  observeFiles(files: string[]) {
    for (const file of files) this.files.add(file);
    return this.violation();
  }

  timeoutViolation() {
    return `Agent run exceeded its ${this.budget.maxDurationSeconds}-second runtime budget.`;
  }

  private violation() {
    if (this.toolCalls > this.budget.maxToolCalls) {
      return `Agent run exceeded its ${this.budget.maxToolCalls}-tool-call budget.`;
    }
    if (this.files.size > this.budget.maxFilesChanged) {
      return `Agent run exceeded its ${this.budget.maxFilesChanged}-changed-file budget.`;
    }
    if (this.subAgents > this.budget.maxSubAgents) {
      return `Agent run exceeded its ${this.budget.maxSubAgents}-sub-agent budget.`;
    }
    return null;
  }
}

export function isToolActivity(label: string) {
  return /command|fileChange|mcpTool|webSearch/iu.test(label);
}

function isSubAgentActivity(label: string) {
  return /collab|subAgent/iu.test(label);
}
