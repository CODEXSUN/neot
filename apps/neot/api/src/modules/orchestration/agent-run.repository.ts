import { randomBytes } from "node:crypto";
import { AppError } from "@neot/framework/errors";
import type { Selectable } from "kysely";
import { getNEOTDatabase } from "../../database/neot-database.js";
import type { AgentRunsTable } from "../../database/schema.js";
import type { AgentAccessMode, AgentRisk } from "./agent-run.policy.js";
import { defaultAgentRunBudget, isToolActivity } from "./agent-run.budget.js";
import {
  assertAgentRunTransition,
  isTerminalAgentRunStatus,
  type AgentRunStatus
} from "./agent-run.state.js";

type CreateRunInput = {
  access: AgentAccessMode;
  chatThreadUuid: string;
  connectionId: string;
  message: string;
  model: string;
  projectKey: string;
  projectTitle: string;
  projectUuid: string;
};

type RunUpdate = {
  base_revision?: string;
  branch_name?: string | null;
  commit_hash?: string;
  committed_at?: Date;
  codex_thread_id?: string;
  codex_turn_id?: string;
  connection_id?: string;
  completed_at?: Date;
  error_message?: string;
  result_summary?: string;
  started_at?: Date;
  status?: AgentRunStatus;
  source_root?: string;
  supervisor_persona_uuid?: string | null;
  review_status?: string;
  verification_completed_at?: Date;
  verification_fingerprint?: string | null;
  verification_status?: string;
  workspace_cleaned_at?: Date;
  workspace_mode?: string;
  workspace_path?: string;
  workspace_status?: string;
};

export class AgentRunRepository {
  private readonly database = getNEOTDatabase();

  async create(input: CreateRunInput, actorId: string) {
    const uuid = id();
    await this.database
      .insertInto("neot_agent_runs")
      .values({
        access_mode: input.access,
        actor_id: actorId,
        agent_profile: profileFor(input.access),
        supervisor_persona_uuid: null,
        assist_mode: modeFor(input.access),
        budget_json: JSON.stringify(defaultAgentRunBudget),
        chat_thread_uuid: input.chatThreadUuid,
        codex_thread_id: null,
        codex_turn_id: null,
        connection_id: input.connectionId,
        completed_at: null,
        error_message: null,
        model: input.model,
        objective: input.message,
        project_key: input.projectKey,
        project_title: input.projectTitle,
        project_uuid: input.projectUuid,
        result_summary: null,
        started_at: null,
        status: "planning",
        uuid,
        base_revision: null,
        branch_name: null,
        commit_hash: null,
        committed_at: null,
        review_status: "pending",
        source_root: null,
        workspace_cleaned_at: null,
        workspace_mode: "source",
        verification_completed_at: null,
        verification_fingerprint: null,
        verification_status: "not_run",
        workspace_path: null,
        workspace_status: "source"
      })
      .executeTakeFirstOrThrow();
    await this.event(uuid, actorId, "run.created", { access: input.access, model: input.model });
    return uuid;
  }

  async createChild(
    parentUuid: string,
    actorId: string,
    input: { agentProfile: string; objective: string }
  ) {
    const parent = await this.requireRun(parentUuid, actorId);
    const uuid = id();
    const access = childAccess(parent.access_mode as AgentAccessMode, input.agentProfile);
    await this.database
      .insertInto("neot_agent_runs")
      .values({
        access_mode: access,
        actor_id: actorId,
        agent_profile: input.agentProfile,
        supervisor_persona_uuid: parent.supervisor_persona_uuid,
        assist_mode: "Develop",
        base_revision: null,
        branch_name: null,
        budget_json: parent.budget_json,
        chat_thread_uuid: parent.chat_thread_uuid,
        codex_thread_id: null,
        codex_turn_id: null,
        connection_id: parent.connection_id,
        commit_hash: null,
        committed_at: null,
        completed_at: null,
        error_message: null,
        model: parent.model,
        objective: input.objective,
        project_key: parent.project_key,
        project_title: parent.project_title,
        project_uuid: parent.project_uuid,
        result_summary: null,
        review_status: "child_pending",
        source_root: null,
        started_at: null,
        status: "planning",
        uuid,
        verification_completed_at: null,
        verification_fingerprint: null,
        verification_status: "not_run",
        workspace_cleaned_at: null,
        workspace_mode: "source",
        workspace_path: null,
        workspace_status: "source"
      })
      .executeTakeFirstOrThrow();
    await this.event(uuid, actorId, "run.child.created", { parentUuid });
    return { access, sourceRoot: parent.source_root, uuid };
  }

  async start(uuid: string, actorId: string, threadId: string, turnId: string) {
    await this.updateOwned(uuid, actorId, {
      codex_thread_id: threadId,
      codex_turn_id: turnId,
      started_at: new Date(),
      status: "running"
    });
    await this.event(uuid, actorId, "run.started", { threadId, turnId });
  }

  async recover(uuid: string, actorId: string, threadId: string, turnId: string) {
    await this.database
      .updateTable("neot_agent_approvals")
      .set({
        decided_at: new Date(),
        decision: "decline",
        status: "cancelled"
      })
      .where("run_uuid", "=", uuid)
      .where("status", "=", "pending")
      .execute();
    await this.start(uuid, actorId, threadId, turnId);
    await this.event(uuid, actorId, "run.recovered", { threadId, turnId });
  }

  async markDispatched(uuid: string, actorId: string, parentUuid: string) {
    await this.updateOwned(uuid, actorId, { started_at: new Date(), status: "running" });
    await this.event(uuid, actorId, "run.child.dispatched", { parentUuid });
  }

  async assignSupervisor(uuid: string, actorId: string, personaUuid: string | null) {
    await this.updateOwned(uuid, actorId, { supervisor_persona_uuid: personaUuid });
    await this.event(uuid, actorId, "run.supervisor.assigned", { personaUuid });
  }

  async setConnection(uuid: string, actorId: string, connectionId: string) {
    await this.updateOwned(uuid, actorId, { connection_id: connectionId });
    await this.event(uuid, actorId, "run.connector.selected", { connectionId });
  }

  async setWorkspace(
    uuid: string,
    actorId: string,
    workspace: {
      baseRevision: string;
      branchName: string | null;
      mode: "source" | "worktree";
      path: string;
      sourceRoot: string;
      status: string;
    }
  ) {
    await this.updateOwned(uuid, actorId, {
      base_revision: workspace.baseRevision,
      branch_name: workspace.branchName,
      source_root: workspace.sourceRoot,
      workspace_mode: workspace.mode,
      workspace_path: workspace.path,
      workspace_status: workspace.status
    });
    await this.event(uuid, actorId, "run.workspace.prepared", workspace);
  }

  async setWorkspaceStatus(uuid: string, actorId: string, status: string) {
    await this.updateOwned(uuid, actorId, { workspace_status: status });
    await this.event(uuid, actorId, "run.workspace.status", { status });
  }

  async markWorkspaceCleaned(uuid: string, actorId: string) {
    await this.updateOwned(uuid, actorId, {
      workspace_cleaned_at: new Date(),
      workspace_status: "cleaned"
    });
    await this.event(uuid, actorId, "run.workspace.cleaned", {});
  }

  async workspace(uuid: string, actorId: string) {
    const run = await this.requireRun(uuid, actorId);
    return {
      baseRevision: run.base_revision,
      branchName: run.branch_name,
      mode: run.workspace_mode,
      path: run.workspace_path,
      sourceRoot: run.source_root,
      status: run.status,
      workspaceStatus: run.workspace_status
    };
  }

  async verificationContext(uuid: string, actorId: string) {
    const run = await this.requireRun(uuid, actorId);
    return {
      access: run.access_mode,
      branchName: run.branch_name,
      commitHash: run.commit_hash,
      reviewStatus: run.review_status,
      runStatus: run.status,
      sourceRoot: run.source_root,
      verificationStatus: run.verification_status,
      verificationFingerprint: run.verification_fingerprint,
      workspaceMode: run.workspace_mode,
      workspacePath: run.workspace_path,
      workspaceStatus: run.workspace_status
    };
  }

  async startVerification(uuid: string, actorId: string) {
    const run = await this.requireRun(uuid, actorId);
    const row = await this.database
      .selectFrom("neot_agent_verifications")
      .select(({ fn }) => fn.max<number>("attempt_no").as("maximum"))
      .where("run_uuid", "=", uuid)
      .executeTakeFirst();
    const attempt = Number(row?.maximum ?? 0) + 1;
    await this.updateOwned(uuid, actorId, {
      review_status: "verification",
      verification_fingerprint: null,
      verification_status: "running"
    });
    await this.event(uuid, actorId, "run.verification.started", { attempt });
    return { attempt, run };
  }

  async recordVerification(
    uuid: string,
    input: {
      args: string[];
      attempt: number;
      command: string;
      commandId: string;
      durationMs: number;
      exitCode: number | null;
      label: string;
      required: boolean;
      status: string;
      stderr: string;
      stdout: string;
    }
  ) {
    await this.database
      .insertInto("neot_agent_verifications")
      .values({
        args_json: JSON.stringify(input.args),
        attempt_no: input.attempt,
        command_id: input.commandId,
        command_name: input.command,
        completed_at: new Date(),
        duration_ms: input.durationMs,
        exit_code: input.exitCode,
        label: input.label,
        required_gate: input.required ? 1 : 0,
        run_uuid: uuid,
        status: input.status,
        stderr_text: input.stderr,
        stdout_text: input.stdout,
        uuid: id()
      })
      .executeTakeFirstOrThrow();
  }

  async finishVerification(
    uuid: string,
    actorId: string,
    passed: boolean,
    attempt: number,
    fingerprint: string | null
  ) {
    const status = passed ? "passed" : "failed";
    await this.updateOwned(uuid, actorId, {
      review_status: passed ? "ready_for_review" : "rework_required",
      verification_completed_at: new Date(),
      verification_fingerprint: passed ? fingerprint : null,
      verification_status: status
    });
    await this.event(uuid, actorId, "run.verification.completed", { attempt, status });
  }

  async requestRework(uuid: string, actorId: string, note: string) {
    const run = await this.requireRun(uuid, actorId);
    if (!isTerminalAgentRunStatus(run.status)) {
      throw new AppError({
        code: "AGENT_RUN_ACTIVE",
        message: "Wait for the Agent run to finish before review.",
        statusCode: 409
      });
    }
    await this.updateOwned(uuid, actorId, { review_status: "rework_required" });
    await this.event(uuid, actorId, "run.rework.requested", { note });
    return { note, reviewStatus: "rework_required" };
  }

  async markCommitted(uuid: string, actorId: string, commitHash: string, message: string) {
    await this.updateOwned(uuid, actorId, {
      commit_hash: commitHash,
      committed_at: new Date(),
      review_status: "committed",
      workspace_status: "clean"
    });
    await this.event(uuid, actorId, "run.commit.created", { commitHash, message });
  }

  async activity(uuid: string, actorId: string, label: string) {
    const sequence = await this.nextSequence(uuid);
    await this.database
      .insertInto("neot_agent_run_steps")
      .values({
        completed_at: null,
        kind: "codex.activity",
        label,
        output_json: "{}",
        run_uuid: uuid,
        sequence_no: sequence,
        started_at: new Date(),
        status: "running",
        uuid: id()
      })
      .executeTakeFirstOrThrow();
    if (isToolActivity(label)) {
      await this.database
        .insertInto("neot_agent_tool_calls")
        .values({
          completed_at: null,
          input_json: "{}",
          output_json: "{}",
          risk_level: riskFor(label),
          run_uuid: uuid,
          started_at: new Date(),
          status: "observed",
          tool_name: label,
          uuid: id()
        })
        .executeTakeFirstOrThrow();
    }
    await this.event(uuid, actorId, "run.activity", { label });
  }

  async files(uuid: string, actorId: string, files: string[]) {
    for (const path of files) {
      await this.database
        .insertInto("neot_agent_artifacts")
        .ignore()
        .values({
          artifact_type: "changed-file",
          label: path.split("/").at(-1) ?? path,
          metadata_json: JSON.stringify({ source: "codex-diff" }),
          path,
          run_uuid: uuid,
          uuid: id()
        })
        .executeTakeFirst();
    }
    await this.event(uuid, actorId, "run.files", { files });
  }

  async requestApproval(
    uuid: string,
    actorId: string,
    input: { reason: string; requestId: number; threadId: string }
  ) {
    await this.database
      .insertInto("neot_agent_approvals")
      .ignore()
      .values({
        actor_id: actorId,
        decision: null,
        decided_at: null,
        reason: input.reason,
        request_id: input.requestId,
        run_uuid: uuid,
        status: "pending",
        thread_id: input.threadId,
        uuid: id()
      })
      .executeTakeFirst();
    await this.updateOwned(uuid, actorId, { status: "awaiting_approval" });
    await this.event(uuid, actorId, "run.approval.requested", input);
  }

  async resolveApproval(
    actorId: string,
    input: { decision: string; requestId: number; threadId: string }
  ) {
    const approval = await this.database
      .selectFrom("neot_agent_approvals")
      .select(["run_uuid", "uuid"])
      .where("actor_id", "=", actorId)
      .where("thread_id", "=", input.threadId)
      .where("request_id", "=", input.requestId)
      .where("status", "=", "pending")
      .executeTakeFirst();
    if (!approval) throw AppError.notFound("Agent approval request was not found.");
    await this.database
      .updateTable("neot_agent_approvals")
      .set({
        decided_at: new Date(),
        decision: input.decision,
        status: input.decision === "decline" ? "declined" : "approved"
      })
      .where("uuid", "=", approval.uuid)
      .where("actor_id", "=", actorId)
      .executeTakeFirst();
    await this.updateOwned(approval.run_uuid, actorId, {
      status: input.decision === "decline" ? "cancelled" : "running"
    });
    await this.event(approval.run_uuid, actorId, "run.approval.decided", {
      decision: input.decision
    });
    return approval.run_uuid;
  }

  async complete(uuid: string, actorId: string, summary: string) {
    const current = await this.requireRun(uuid, actorId);
    if (isTerminalAgentRunStatus(current.status)) return;
    await this.finishSteps(uuid, "completed");
    await this.updateOwned(uuid, actorId, {
      completed_at: new Date(),
      result_summary: summary,
      status: "completed"
    });
    await this.event(uuid, actorId, "run.completed", {});
  }

  async fail(uuid: string, actorId: string, message: string) {
    const current = await this.requireRun(uuid, actorId);
    if (isTerminalAgentRunStatus(current.status)) return;
    await this.finishSteps(uuid, "failed");
    await this.updateOwned(uuid, actorId, {
      completed_at: new Date(),
      error_message: message,
      status: "failed"
    });
    await this.event(uuid, actorId, "run.failed", { message });
  }

  async list(projectUuid: string, actorId: string) {
    const rows = await this.database
      .selectFrom("neot_agent_runs")
      .selectAll()
      .where("actor_id", "=", actorId)
      .where("project_uuid", "=", projectUuid)
      .orderBy("updated_at", "desc")
      .limit(30)
      .execute();
    return rows.map(mapRun);
  }

  async find(uuid: string, actorId: string) {
    const run = await this.requireRun(uuid, actorId);
    const [steps, events, approvals, artifacts, toolCalls, verifications] = await Promise.all([
      this.database
        .selectFrom("neot_agent_run_steps")
        .selectAll()
        .where("run_uuid", "=", uuid)
        .orderBy("sequence_no")
        .execute(),
      this.database
        .selectFrom("neot_agent_events")
        .selectAll()
        .where("run_uuid", "=", uuid)
        .orderBy("created_at")
        .execute(),
      this.database
        .selectFrom("neot_agent_approvals")
        .selectAll()
        .where("run_uuid", "=", uuid)
        .orderBy("created_at")
        .execute(),
      this.database
        .selectFrom("neot_agent_artifacts")
        .selectAll()
        .where("run_uuid", "=", uuid)
        .orderBy("created_at")
        .execute(),
      this.database
        .selectFrom("neot_agent_tool_calls")
        .selectAll()
        .where("run_uuid", "=", uuid)
        .orderBy("created_at")
        .execute(),
      this.database
        .selectFrom("neot_agent_verifications")
        .selectAll()
        .where("run_uuid", "=", uuid)
        .orderBy("attempt_no")
        .orderBy("created_at")
        .execute()
    ]);
    return {
      ...mapRun(run),
      approvals: approvals.map((item) => ({
        createdAt: iso(item.created_at),
        decision: item.decision,
        reason: item.reason,
        requestId: item.request_id,
        status: item.status,
        uuid: item.uuid
      })),
      artifacts: artifacts.map((item) => ({
        createdAt: iso(item.created_at),
        label: item.label,
        path: item.path,
        type: item.artifact_type,
        uuid: item.uuid
      })),
      events: events.map((item) => ({
        createdAt: iso(item.created_at),
        payload: parseJson(item.payload_json),
        type: item.event_type,
        uuid: item.uuid
      })),
      steps: steps.map((item) => ({
        completedAt: iso(item.completed_at),
        kind: item.kind,
        label: item.label,
        sequence: item.sequence_no,
        startedAt: iso(item.started_at),
        status: item.status,
        uuid: item.uuid
      })),
      toolCalls: toolCalls.map((item) => ({
        completedAt: iso(item.completed_at),
        name: item.tool_name,
        risk: item.risk_level,
        startedAt: iso(item.started_at),
        status: item.status,
        uuid: item.uuid
      })),
      verifications: verifications.map((item) => ({
        args: parseJson(item.args_json),
        attempt: item.attempt_no,
        command: item.command_name,
        commandId: item.command_id,
        completedAt: iso(item.completed_at),
        durationMs: item.duration_ms,
        exitCode: item.exit_code,
        label: item.label,
        required: Boolean(item.required_gate),
        status: item.status,
        stderr: item.stderr_text,
        stdout: item.stdout_text,
        uuid: item.uuid
      }))
    };
  }

  private event(runUuid: string, actorId: string, type: string, payload: unknown) {
    return this.database
      .insertInto("neot_agent_events")
      .values({
        actor_id: actorId,
        event_type: type,
        payload_json: JSON.stringify(payload),
        run_uuid: runUuid,
        uuid: id()
      })
      .executeTakeFirstOrThrow();
  }

  private async nextSequence(runUuid: string) {
    const row = await this.database
      .selectFrom("neot_agent_run_steps")
      .select(({ fn }) => fn.max<number>("sequence_no").as("maximum"))
      .where("run_uuid", "=", runUuid)
      .executeTakeFirst();
    return Number(row?.maximum ?? 0) + 1;
  }

  private finishSteps(runUuid: string, status: string) {
    return this.database
      .updateTable("neot_agent_run_steps")
      .set({ completed_at: new Date(), status })
      .where("run_uuid", "=", runUuid)
      .where("status", "=", "running")
      .execute();
  }

  private async updateOwned(uuid: string, actorId: string, input: RunUpdate) {
    const run = await this.requireRun(uuid, actorId);
    if (input.status) assertAgentRunTransition(run.status, input.status);
    await this.database
      .updateTable("neot_agent_runs")
      .set(input)
      .where("uuid", "=", uuid)
      .where("actor_id", "=", actorId)
      .executeTakeFirst();
  }

  private async requireRun(uuid: string, actorId: string) {
    const run = await this.database
      .selectFrom("neot_agent_runs")
      .selectAll()
      .where("uuid", "=", uuid)
      .where("actor_id", "=", actorId)
      .executeTakeFirst();
    if (!run) throw AppError.notFound("Agent run was not found.");
    return run;
  }
}

function mapRun(run: Selectable<AgentRunsTable>) {
  return {
    access: run.access_mode,
    agentProfile: run.agent_profile,
    assistMode: run.assist_mode,
    connectionId: run.connection_id,
    supervisorPersonaUuid: run.supervisor_persona_uuid,
    budget: JSON.parse(run.budget_json) as unknown,
    chatThreadUuid: run.chat_thread_uuid,
    completedAt: iso(run.completed_at),
    createdAt: iso(run.created_at),
    errorMessage: run.error_message,
    model: run.model,
    objective: run.objective,
    projectKey: run.project_key,
    projectTitle: run.project_title,
    projectUuid: run.project_uuid,
    resultSummary: run.result_summary,
    startedAt: iso(run.started_at),
    status: run.status,
    updatedAt: iso(run.updated_at),
    uuid: run.uuid,
    baseRevision: run.base_revision,
    branchName: run.branch_name,
    sourceRoot: run.source_root,
    commitHash: run.commit_hash,
    committedAt: iso(run.committed_at),
    reviewStatus: run.review_status,
    verificationCompletedAt: iso(run.verification_completed_at),
    verificationStatus: run.verification_status,
    verificationFingerprint: run.verification_fingerprint,
    workspaceCleanedAt: iso(run.workspace_cleaned_at),
    workspaceMode: run.workspace_mode,
    workspacePath: run.workspace_path,
    workspaceStatus: run.workspace_status
  };
}

function iso(value: unknown) {
  return value ? new Date(value as string | Date).toISOString() : null;
}
function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
function id() {
  return randomBytes(8).toString("hex");
}
function modeFor(access: AgentAccessMode) {
  return access === "plan" ? "plan" : access === "read-only" ? "ask" : "build";
}
function profileFor(access: AgentAccessMode) {
  return access === "plan" ? "planning" : access === "read-only" ? "review" : "coding";
}
function childAccess(parent: AgentAccessMode, profile: string): AgentAccessMode {
  if (profile === "planning") return "plan";
  if (profile === "review" || profile === "security") return "read-only";
  return parent;
}
function riskFor(label: string): AgentRisk {
  return /command|fileChange|mcpTool/iu.test(label) ? "medium" : "low";
}

export const agentRunRepository = new AgentRunRepository();
