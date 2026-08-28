import { orchestrationCatalogSchema, type OrchestrationCatalog } from "./orchestration.schemas.js";

const catalog = {
  agentProfiles: [
    agent(
      "planning",
      "Planning Agent",
      "Turns requirements into architecture, dependencies, milestones, and executable tasks.",
      ["requirements", "architecture", "dependencies", "milestones", "acceptance-criteria"],
      "plan",
      "project"
    ),
    agent(
      "coding",
      "Coding Agent",
      "Inspects repositories, implements scoped changes, and verifies the resulting code.",
      ["repository-inspection", "implementation", "terminal", "git", "verification"],
      "build",
      "development",
      ["destructive filesystem changes", "protected branch updates"]
    ),
    agent(
      "review",
      "Review Agent",
      "Reviews correctness, architecture, security, performance, maintainability, and tests.",
      ["code-review", "architecture-review", "risk-analysis", "quality-gates"],
      "review",
      "read-only"
    ),
    agent(
      "testing",
      "Testing Agent",
      "Generates and runs tests, diagnoses failures, and reports evidence without hiding errors.",
      ["test-generation", "test-execution", "failure-analysis", "coverage-analysis"],
      "test",
      "development"
    ),
    agent(
      "devops",
      "DevOps Agent",
      "Analyzes builds, deployments, infrastructure, logs, and service health.",
      ["builds", "deployments", "containers", "logs", "health"],
      "deploy",
      "deployment",
      ["production deployment", "rollback", "infrastructure changes"]
    ),
    agent(
      "security",
      "Security Agent",
      "Reviews secrets, dependencies, authentication, authorization, API, and infrastructure risks.",
      ["secrets", "dependencies", "authentication", "authorization", "threat-review"],
      "review",
      "read-only"
    )
  ],
  architecture: "modular-monolith",
  assistModes: [
    mode("ask", "Ask", "Answer from project and repository context.", "read-only"),
    mode("plan", "Plan", "Create requirements and an implementation plan.", "project"),
    mode("build", "Build", "Implement scoped development changes.", "development"),
    mode("debug", "Debug", "Inspect failures, logs, and runtime state.", "development"),
    mode("review", "Review", "Review changes without modifying them.", "read-only"),
    mode("test", "Test", "Run and analyze project verification.", "development"),
    mode("deploy", "Deploy", "Prepare or execute an approved deployment.", "deployment"),
    mode("analyze", "Analyze", "Correlate engineering evidence and metrics.", "read-only"),
    mode("explain", "Explain", "Explain code, architecture, or operations.", "read-only")
  ],
  controlBoundaries: [
    boundary(
      "model-gateway",
      "Model-independent",
      "Agents request capabilities; provider adapters and workspace policy choose local or remote models."
    ),
    boundary(
      "validated-tools",
      "Validated tools",
      "Tool inputs and outputs use explicit schemas and permission checks before execution."
    ),
    boundary(
      "human-approval",
      "Human approval",
      "Production, secrets, destructive data, DNS, and infrastructure changes stop for approval."
    ),
    boundary(
      "isolated-execution",
      "Isolated execution",
      "Significant coding runs use branches or worktrees, bounded resources, conflict checks, and audit history."
    )
  ],
  externalLabel: "NEOT",
  lifecycle: [
    phase(
      "plan",
      "Plan",
      "Requirements, architecture, dependencies, and milestones.",
      "/app/neot/planning",
      "connected"
    ),
    phase(
      "develop",
      "Develop",
      "Projects, tasks, source changes, and implementation.",
      "/app/neot/tasks",
      "connected"
    ),
    phase(
      "source",
      "Source",
      "Repository state, branches, changes, and GitHub signals.",
      "/app/neot/tasks",
      "connected"
    ),
    phase(
      "test",
      "Test",
      "Verification work, failures, and quality gates.",
      "/app/neot/tasks",
      "foundation"
    ),
    phase(
      "review",
      "Review",
      "Human and agent review with explicit findings and approvals.",
      "/app/neot/tasks",
      "foundation",
      true
    ),
    phase(
      "preview",
      "Preview",
      "Isolated build and review environments.",
      "/app/neot/agent-ide",
      "planned"
    ),
    phase(
      "deploy",
      "Deploy",
      "Controlled delivery with health checks and rollback.",
      "/app/neot/agent-ide",
      "planned",
      true
    ),
    phase(
      "observe",
      "Observe",
      "Health, changes, failures, and engineering outcomes.",
      "/app/neot/today",
      "foundation"
    )
  ],
  technicalName: "neot"
} satisfies OrchestrationCatalog;

export class OrchestrationService {
  catalog() {
    return orchestrationCatalogSchema.parse(catalog);
  }
}

function agent(
  id: string,
  name: string,
  description: string,
  capabilities: string[],
  defaultMode: string,
  permissionLevel: OrchestrationCatalog["agentProfiles"][number]["permissionLevel"],
  requiresApprovalFor: string[] = []
) {
  return {
    capabilities,
    defaultMode,
    description,
    id,
    name,
    permissionLevel,
    requiresApprovalFor,
    status: "definition-ready" as const
  };
}

function mode(
  id: string,
  label: string,
  purpose: string,
  permissionLevel: OrchestrationCatalog["assistModes"][number]["permissionLevel"]
) {
  return { id, label, permissionLevel, purpose };
}

function boundary(id: string, title: string, description: string) {
  return { description, id, title };
}

function phase(
  id: string,
  label: string,
  objective: string,
  href: string,
  state: OrchestrationCatalog["lifecycle"][number]["state"],
  approvalRequired = false
) {
  return { approvalRequired, href, id, label, objective, state };
}
