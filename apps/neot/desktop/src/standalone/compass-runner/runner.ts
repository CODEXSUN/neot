import type { CompassApproval, CompassDirective, CompassEvent, CompassExecutorAdapter, CompassInteraction, CompassSnapshot, CompassTask } from "./contracts";

/** A small, deterministic flow engine for a future standalone runner module. */
export class CompassRunner {
  private readonly events: CompassEvent[] = [];
  private readonly artifacts: NonNullable<CompassSnapshot["artifacts"]>[number][] = [];
  private status: CompassSnapshot["status"] = "draft";
  private approval: CompassApproval | undefined;
  private interaction: CompassInteraction | undefined;
  private result: string | undefined;
  private error: string | undefined;
  private approved = false;

  constructor(private readonly task: CompassTask, private readonly adapter: CompassExecutorAdapter, private readonly now: () => Date = () => new Date()) {
    if (task.adapter !== adapter.id) throw new Error(`Task adapter ${task.adapter} does not match executor ${adapter.id}.`);
  }

  snapshot(): CompassSnapshot {
    return {
      task: this.task,
      status: this.status,
      events: this.events,
      ...(this.approval ? { approval: this.approval } : {}),
      ...(this.interaction ? { interaction: this.interaction } : {}),
      ...(this.result ? { result: this.result } : {}),
      artifacts: this.artifacts,
      ...(this.error ? { error: this.error } : {})
    };
  }

  async start(): Promise<CompassSnapshot> {
    this.requireStatus("draft");
    this.status = "planning";
    this.record("planned", `Prepared isolated ${this.task.adapter} execution for ${this.task.title}.`);
    return this.dispatch({});
  }

  async decideApproval(decision: "approve" | "decline"): Promise<CompassSnapshot> {
    this.requireStatus("awaiting-approval");
    if (decision === "decline") {
      this.status = "cancelled";
      this.record("cancelled", "Approval declined. No executor action was started.");
      return this.snapshot();
    }
    this.approval = undefined;
    this.approved = true;
    return this.dispatch({ approved: this.approved });
  }

  async respond(answer: string): Promise<CompassSnapshot> {
    this.requireStatus("awaiting-input");
    const trimmed = answer.trim();
    if (!trimmed) throw new Error("A response is required.");
    if (this.interaction?.choices && !this.interaction.choices.includes(trimmed)) throw new Error("Choose one of the offered actions.");
    this.interaction = undefined;
    return this.dispatch({ approved: this.approved, response: trimmed });
  }

  private async dispatch(input: { approved?: boolean; response?: string }): Promise<CompassSnapshot> {
    this.status = "running";
    try {
      const directive = await this.adapter.execute({ task: this.task, ...input });
      this.applyDirective(directive);
    } catch (cause) {
      this.status = "failed";
      this.error = cause instanceof Error ? cause.message : "Unknown executor failure.";
      this.record("failed", this.error);
    }
    return this.snapshot();
  }

  private applyDirective(directive: CompassDirective) {
    this.record("log", directive.log);
    if (directive.kind === "approval") {
      this.status = "awaiting-approval";
      this.approval = directive.approval;
      this.record("approval-requested", directive.approval.summary);
      return;
    }
    if (directive.kind === "interaction") {
      this.status = "awaiting-input";
      this.interaction = directive.interaction;
      this.record("input-requested", directive.interaction.question);
      return;
    }
    if (directive.kind === "failure") {
      this.status = "failed";
      this.error = directive.message;
      this.record("failed", directive.message);
      return;
    }
    this.status = "completed";
    this.result = directive.summary;
    this.artifacts.push(...(directive.artifacts ?? []));
    this.record("completed", directive.summary);
  }

  private record(type: CompassEvent["type"], message: string) { this.events.push({ at: this.now().toISOString(), type, message }); }
  private requireStatus(expected: CompassSnapshot["status"]) { if (this.status !== expected) throw new Error(`Cannot perform this action while the run is ${this.status}.`); }
}
