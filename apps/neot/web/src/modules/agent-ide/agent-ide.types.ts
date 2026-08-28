export type AgentIdeSettings = {
  baseUrl: string;
  configured: boolean;
  model: string;
  provider: "openai";
  reasoningEffort: "high" | "low" | "medium";
};

export type AgentIdePlanResult = {
  model: string;
  output: string;
  provider: "openai";
  responseId: string;
};

export type AgentIdeConnectionId = "primary" | "secondary";

export type AgentIdeChatAction = {
  id: string;
  label: string;
  status: "completed" | "failed" | "running";
  type: "command" | "compaction" | "file" | "search" | "subagent" | "tool";
};

export type AgentIdeCodexStatus = {
  available: boolean;
  connected: boolean;
  default: boolean;
  email: string | null;
  error: string | null;
  id: AgentIdeConnectionId;
  label: string;
  planType: string | null;
};

export type AgentIdeChatEvent =
  | {
      type: "chat.started";
      conversationId: string;
      runId: string;
      threadId: string;
      turnId: string;
    }
  | { type: "chat.delta"; delta: string }
  | { type: "chat.action"; action: AgentIdeChatAction }
  | { type: "chat.files"; files: string[] }
  | {
      type: "chat.approval";
      requestId: number;
      reason: string;
      threadId: string;
    }
  | { type: "chat.completed"; messageId: string; status: string }
  | { type: "chat.failed"; message: string };

export type AgentIdeChatMessage = {
  actions: AgentIdeChatAction[];
  attachments: Array<{ name: string; size: number }>;
  createdAt: number;
  durationMs: number | null;
  feedback: "down" | "up" | null;
  files: string[];
  id: string;
  role: "assistant" | "user";
  text: string;
};

export type AgentIdeApproval = {
  reason: string;
  requestId: number;
  threadId: string;
};

export type AgentIdeChatHistory = {
  access: AgentIdeAccess;
  codexThreadId: string | null;
  connectionId: AgentIdeConnectionId;
  createdAt: string;
  model: AgentIdeModel;
  projectKey: string;
  projectTitle: string;
  projectUuid: string;
  workItem: {
    id: string;
    key: string;
    kind: "activity" | "issue" | "project" | "review" | "task";
    title: string;
  } | null;
  title: string;
  updatedAt: string;
  uuid: string;
};

export type AgentIdeChatHistoryDetail = AgentIdeChatHistory & {
  messages: Array<{
    actions: AgentIdeChatAction[];
    attachments: Array<{ name: string; size: number }>;
    body: string;
    createdAt: string;
    durationMs: number | null;
    feedback: "down" | "up" | null;
    files: string[];
    role: "assistant" | "user";
    uuid: string;
  }>;
};

export type AgentIdeAccess = "plan" | "read-only" | "ask-approval" | "auto-approve" | "full-access";
export type AgentIdeModel = "gpt-5.6-luna" | "gpt-5.6-sol" | "gpt-5.6-terra";
export type AgentIdeAttachment = {
  content: string;
  kind: "image" | "text";
  mimeType: string;
  name: string;
  size: number;
};

export type AgentRunSummary = {
  access: AgentIdeAccess;
  agentProfile: string;
  connectionId: AgentIdeConnectionId;
  supervisorPersonaUuid: string | null;
  assistMode: string;
  budget: {
    maxDurationSeconds: number;
    maxFilesChanged: number;
    maxSubAgents: number;
    maxToolCalls: number;
  };
  chatThreadUuid: string;
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  model: string;
  objective: string;
  projectKey: string;
  projectTitle: string;
  projectUuid: string;
  resultSummary: string | null;
  startedAt: string | null;
  status: AgentRunStatus;
  updatedAt: string;
  uuid: string;
  baseRevision: string | null;
  branchName: string | null;
  commitHash: string | null;
  committedAt: string | null;
  reviewStatus: string;
  sourceRoot: string | null;
  workspaceCleanedAt: string | null;
  workspaceMode: "source" | "worktree";
  workspacePath: string | null;
  workspaceStatus: string;
  verificationCompletedAt: string | null;
  verificationFingerprint: string | null;
  verificationStatus: string;
};

export type AgentRunDetail = AgentRunSummary & {
  approvals: Array<{
    createdAt: string;
    decision: string | null;
    reason: string;
    requestId: number;
    status: string;
    uuid: string;
  }>;
  artifacts: Array<{ createdAt: string; label: string; path: string; type: string; uuid: string }>;
  events: Array<{ createdAt: string; payload: unknown; type: string; uuid: string }>;
  steps: Array<{
    completedAt: string | null;
    kind: string;
    label: string;
    sequence: number;
    startedAt: string | null;
    status: string;
    uuid: string;
  }>;
  toolCalls: Array<{
    completedAt: string | null;
    name: string;
    risk: string;
    startedAt: string;
    status: string;
    uuid: string;
  }>;
  verifications: Array<{
    args: string[];
    attempt: number;
    command: string;
    commandId: string;
    completedAt: string;
    durationMs: number;
    exitCode: number | null;
    label: string;
    required: boolean;
    status: string;
    stderr: string;
    stdout: string;
    uuid: string;
  }>;
};

export type AgentRunStatus =
  "awaiting_approval" | "cancelled" | "completed" | "failed" | "planning" | "running";

export type AgentTaskGraph = {
  parentRunUuid: string;
  supervisor: AgentPersona | null;
  reviews: Array<{
    createdAt: string;
    decision: "approved" | "rework";
    note: string;
    uuid: string;
  }>;
  tasks: Array<{
    agentProfile: string;
    delegate: AgentPersona | null;
    childRunUuid: string | null;
    completedAt: string | null;
    dependsOn: string[];
    key: string;
    objective: string;
    pendingApproval: {
      reason: string;
      requestId: number;
      status: string;
      taskUuid: string;
      threadId: string;
    } | null;
    resultSummary: string | null;
    scopePaths: string[];
    sequence: number;
    startedAt: string | null;
    status: "blocked" | "ready" | "running" | "completed" | "failed";
    title: string;
    uuid: string;
  }>;
};

export type AgentPersona = {
  agentProfile: "coding" | "devops" | "planning" | "review" | "security" | "testing";
  createdAt: string;
  description: string;
  instructions: string;
  key: string;
  name: string;
  role: "delegate" | "supervisor";
  updatedAt: string;
  uuid: string;
};
