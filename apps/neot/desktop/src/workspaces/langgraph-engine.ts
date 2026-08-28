/**
 * LangGraph Agent Orchestration Engine
 * Implements stateful node-based graph execution (Planner -> Coder -> Tester -> Reflection -> Verifier)
 */

export type LangGraphNodeId = "planner" | "coder" | "tester" | "reflection" | "verifier";
export type LangGraphStatus = "idle" | "running" | "waiting_approval" | "passed" | "failed" | "retrying";

export type PlanStep = {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
};

export type LangGraphExecutionState = {
  threadId: string;
  activeNode: LangGraphNodeId;
  status: LangGraphStatus;
  planSteps: PlanStep[];
  attempts: number;
  maxRetries: number;
  logs: { timestamp: string; node: LangGraphNodeId; message: string; type: "info" | "success" | "error" | "warn" }[];
  linterOutput?: string;
  verifiedAt?: string;
};

export const LANGGRAPH_NODES: { id: LangGraphNodeId; label: string; description: string }[] = [
  { id: "planner", label: "Planner", description: "Analyzes prompt & creates execution steps" },
  { id: "coder", label: "Coder Engine", description: "Generates and edits code files" },
  { id: "tester", label: "Linter & Tester", description: "Automated typecheck & unit test verification" },
  { id: "reflection", label: "Self-Reflection", description: "Diagnoses stack traces and auto-corrects code" },
  { id: "verifier", label: "Verifier", description: "Confirms criteria satisfaction and generates summary" }
];

export class LangGraphEngine {
  private state: LangGraphExecutionState;
  private listeners: Set<(state: LangGraphExecutionState) => void> = new Set();

  constructor(threadId: string) {
    this.state = {
      threadId,
      activeNode: "planner",
      status: "idle",
      planSteps: [],
      attempts: 0,
      maxRetries: 3,
      logs: []
    };
  }

  public getState(): LangGraphExecutionState {
    return { ...this.state };
  }

  public subscribe(listener: (state: LangGraphExecutionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  public log(node: LangGraphNodeId, message: string, type: "info" | "success" | "error" | "warn" = "info") {
    const timestamp = new Date().toLocaleTimeString();
    this.state.logs.push({ timestamp, node, message, type });
    this.notify();
  }

  public startGraph(userPrompt: string) {
    this.state.status = "running";
    this.state.activeNode = "planner";
    this.state.attempts = 0;
    this.state.logs = [];
    this.log("planner", `Initializing LangGraph workflow for prompt: "${userPrompt.slice(0, 45)}..."`, "info");

    this.state.planSteps = [
      { id: "1", title: "Analyze workspace context & requirements", status: "running" },
      { id: "2", title: "Apply targeted file modifications", status: "pending" },
      { id: "3", title: "Run typechecks & automated test suite", status: "pending" },
      { id: "4", title: "Verify final solution integrity", status: "pending" }
    ];
    this.notify();
  }

  public transitionToNode(nextTarget: LangGraphNodeId) {
    this.state.activeNode = nextTarget;
    this.log(nextTarget, `Transitioning to ${nextTarget.toUpperCase()} node`, "info");

    const steps = this.state.planSteps;
    if (nextTarget === "planner") {
      if (steps[0]) steps[0].status = "running";
    } else if (nextTarget === "coder") {
      if (steps[0]) steps[0].status = "completed";
      if (steps[1]) steps[1].status = "running";
    } else if (nextTarget === "tester") {
      if (steps[1]) steps[1].status = "completed";
      if (steps[2]) steps[2].status = "running";
    } else if (nextTarget === "reflection") {
      this.state.attempts += 1;
      this.state.status = "retrying";
      if (steps[2]) steps[2].status = "failed";
      this.log("reflection", `Self-Correction Triggered (Attempt ${this.state.attempts}/${this.state.maxRetries})`, "warn");
    } else if (nextTarget === "verifier") {
      if (steps[2]) steps[2].status = "completed";
      if (steps[3]) steps[3].status = "running";
    }
    this.notify();
  }

  public recordTestResults(passed: boolean, details?: string) {
    if (passed) {
      this.log("tester", "Linter and test checks passed cleanly (0 errors).", "success");
      this.transitionToNode("verifier");
    } else {
      this.log("tester", `Test failures detected: ${details ?? "Typecheck error"}`, "error");
      if (this.state.attempts < this.state.maxRetries) {
        this.transitionToNode("reflection");
      } else {
        this.state.status = "failed";
        this.log("tester", `Max self-reflection retry limit (${this.state.maxRetries}) reached. Stopping.`, "error");
      }
    }
  }

  public completeGraph(summary: string) {
    this.state.status = "passed";
    this.state.activeNode = "verifier";
    const steps = this.state.planSteps;
    steps.forEach((step) => {
      if (step.status !== "failed") {
        step.status = "completed";
      }
    });
    this.state.verifiedAt = new Date().toLocaleTimeString();
    this.log("verifier", `LangGraph execution completed successfully: ${summary}`, "success");
    this.notify();
  }
}
