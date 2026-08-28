import { AppError } from "@neot/framework/errors";

export type AgentAccessMode = "ask-approval" | "auto-approve" | "full-access" | "plan" | "read-only";
export type AgentRisk = "critical" | "high" | "low" | "medium";

export type AgentToolDefinition = {
  capability: string;
  description: string;
  id: string;
  minimumAccess: AgentAccessMode;
  risk: AgentRisk;
};

const tools: AgentToolDefinition[] = [
  tool("repository.read", "repository-inspection", "Read files inside the selected project.", "read-only", "low"),
  tool("repository.search", "repository-inspection", "Search project paths and source text.", "read-only", "low"),
  tool("git.inspect", "git", "Read repository status, branches, and diffs.", "read-only", "low"),
  tool("workspace.plan", "planning", "Create a bounded implementation plan.", "plan", "low"),
  tool("workspace.edit", "implementation", "Change files inside an isolated workspace.", "ask-approval", "medium"),
  tool("command.run", "terminal", "Run a registered project command.", "ask-approval", "medium"),
  tool("verification.run", "verification", "Run project checks and capture evidence.", "ask-approval", "medium"),
  tool("git.commit", "git", "Create a commit in the isolated run branch.", "ask-approval", "high"),
  tool("github.pull-request", "source-control", "Publish an approved branch for review.", "full-access", "high"),
  tool("deployment.execute", "deployment", "Run an approved deployment workflow.", "full-access", "critical")
];

const accessRank: Record<AgentAccessMode, number> = {
  "read-only": 0,
  plan: 1,
  "ask-approval": 2,
  "auto-approve": 3,
  "full-access": 4
};

export class AgentPolicyService {
  catalog() {
    return tools;
  }

  evaluate(access: AgentAccessMode, toolId: string) {
    const definition = tools.find((candidate) => candidate.id === toolId);
    if (!definition) {
      return { allowed: false, approvalRequired: true, reason: "The tool is not registered.", risk: "high" as const };
    }
    const allowed = accessRank[access] >= accessRank[definition.minimumAccess];
    const approvalRequired = allowed && definition.risk !== "low" && access === "ask-approval";
    return {
      allowed,
      approvalRequired,
      reason: allowed ? "The access mode permits this tool." : `This tool requires ${definition.minimumAccess} access.`,
      risk: definition.risk
    };
  }

  require(access: AgentAccessMode, toolId: string) {
    const decision = this.evaluate(access, toolId);
    if (!decision.allowed) {
      throw new AppError({ code: "AGENT_TOOL_DENIED", message: decision.reason, statusCode: 403 });
    }
    return decision;
  }
}

function tool(
  id: string,
  capability: string,
  description: string,
  minimumAccess: AgentAccessMode,
  risk: AgentRisk
): AgentToolDefinition {
  return { capability, description, id, minimumAccess, risk };
}

export const agentPolicyService = new AgentPolicyService();
