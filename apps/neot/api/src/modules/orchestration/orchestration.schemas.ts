import { z } from "zod";

export const orchestrationPermissionLevelSchema = z.enum([
  "read-only",
  "development",
  "project",
  "deployment",
  "infrastructure",
  "production",
  "admin"
]);

export const orchestrationCatalogSchema = z
  .object({
    agentProfiles: z.array(
      z
        .object({
          capabilities: z.array(z.string().min(1)),
          defaultMode: z.string().min(1),
          description: z.string().min(1),
          id: z.string().min(1),
          name: z.string().min(1),
          permissionLevel: orchestrationPermissionLevelSchema,
          requiresApprovalFor: z.array(z.string().min(1)),
          status: z.literal("definition-ready")
        })
        .strict()
    ),
    architecture: z.literal("modular-monolith"),
    assistModes: z.array(
      z
        .object({
          id: z.string().min(1),
          label: z.string().min(1),
          permissionLevel: orchestrationPermissionLevelSchema,
          purpose: z.string().min(1)
        })
        .strict()
    ),
    controlBoundaries: z.array(
      z
        .object({
          description: z.string().min(1),
          id: z.string().min(1),
          title: z.string().min(1)
        })
        .strict()
    ),
    externalLabel: z.literal("NEOT"),
    lifecycle: z.array(
      z
        .object({
          approvalRequired: z.boolean(),
          href: z.string().min(1),
          id: z.string().min(1),
          label: z.string().min(1),
          objective: z.string().min(1),
          state: z.enum(["connected", "foundation", "planned"])
        })
        .strict()
    ),
    technicalName: z.literal("neot")
  })
  .strict();

export type OrchestrationCatalog = z.infer<typeof orchestrationCatalogSchema>;

export const modelProviderIdSchema = z.enum([
  "openai",
  "anthropic",
  "openrouter",
  "opencode",
  "deepseek"
]);
export type ModelProviderId = z.infer<typeof modelProviderIdSchema>;

export const modelProviderInputSchema = z
  .object({
    apiKey: z.string().trim().min(20).max(2_000).optional(),
    baseUrl: z.url().max(500),
    label: z.string().trim().min(2).max(120),
    model: z.string().trim().min(1).max(160)
  })
  .strict();
export type ModelProviderInput = z.infer<typeof modelProviderInputSchema>;

export const modelProviderParamSchema = z.object({ provider: modelProviderIdSchema }).strict();

export const agentIdePlanInputSchema = z
  .object({
    brief: z.string().min(10).max(30_000),
    provider: modelProviderIdSchema.default("openai"),
    projectId: z.string().min(1).max(160),
    projectTitle: z.string().min(1).max(240)
  })
  .strict();

export const agentIdePlanResultSchema = z
  .object({
    model: z.string().min(1),
    output: z.string().min(1),
    provider: modelProviderIdSchema,
    responseId: z.string().min(1)
  })
  .strict();

export type AgentIdePlanInput = z.infer<typeof agentIdePlanInputSchema>;
export type AgentIdePlanResult = z.infer<typeof agentIdePlanResultSchema>;

export const launchDeskInputSchema = z.object({
  productBrief: z.string().trim().min(20).max(20_000),
  audience: z.string().trim().min(2).max(2_000),
  launchDate: z.iso.date(),
  constraints: z.string().trim().max(8_000).default(""),
  availableAssets: z.array(z.string().trim().min(1).max(500)).max(30).default([])
});

export type LaunchDeskInput = z.infer<typeof launchDeskInputSchema>;

export const codexLoginCancelSchema = z.object({
  connectionId: z.enum(["primary", "secondary"]).default("primary"),
  loginId: z.string().uuid()
});

export const codexConnectionInputSchema = z
  .object({ connectionId: z.enum(["primary", "secondary"]).default("primary") })
  .strict();

export const codexApiKeyLoginSchema = z
  .object({
    apiKey: z.string().trim().min(20).max(512),
    connectionId: z.enum(["primary", "secondary"]).default("primary")
  })
  .strict();

export const codexChatInputSchema = z
  .object({
    access: z.enum(["plan", "read-only", "ask-approval", "auto-approve", "full-access"]),
    connectionId: z.enum(["primary", "secondary"]).default("primary"),
    attachments: z
      .array(
        z.object({
          content: z.string().max(3_000_000),
          kind: z.enum(["image", "text"]),
          mimeType: z.string().max(160),
          name: z.string().min(1).max(255),
          size: z.number().int().nonnegative().max(2_097_152)
        })
      )
      .max(5),
    message: z.string().trim().min(1).max(30_000),
    conversationId: z.string().length(16).nullable(),
    model: z.enum(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]),
    threadId: z.string().min(1).nullable(),
    workItem: z
      .object({
        id: z.string().min(1).max(160),
        key: z.string().min(1).max(160),
        kind: z.enum(["activity", "issue", "project", "review", "task"]),
        title: z.string().min(1).max(240),
        description: z.string().max(8_000),
        status: z.string().max(80),
        assignee: z.string().max(240),
        priority: z.string().max(80),
        dueDate: z.string().max(40),
        parentId: z.string().max(160),
        parentType: z.string().max(32)
      })
      .strict()
      .nullable(),
    project: z
      .object({
        id: z.string().min(1),
        key: z.string().min(1).max(160),
        title: z.string().min(1).max(240),
        description: z.string().max(4_000),
        moduleKey: z.string().max(160),
        referenceId: z.string().max(500),
        referenceType: z.string().max(160)
      })
      .strict()
  })
  .strict();

export type CodexChatInput = z.infer<typeof codexChatInputSchema>;

export const codexApprovalInputSchema = z
  .object({
    decision: z.enum(["accept", "acceptForSession", "decline"]),
    requestId: z.number().int().positive(),
    threadId: z.string().min(1)
  })
  .strict();

export const agentReworkInputSchema = z
  .object({
    note: z.string().trim().min(3).max(4_000)
  })
  .strict();

export const agentCommitInputSchema = z
  .object({
    approved: z.literal(true),
    message: z.string().trim().min(3).max(240)
  })
  .strict();

export const agentPersonaInputSchema = z
  .object({
    agentProfile: z.enum(["coding", "devops", "planning", "review", "security", "testing"]),
    description: z.string().trim().min(3).max(500),
    instructions: z.string().trim().min(3).max(4_000),
    key: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]*$/u)
      .max(80),
    name: z.string().trim().min(2).max(80),
    role: z.enum(["supervisor", "delegate"])
  })
  .strict();

export type AgentPersonaInput = z.infer<typeof agentPersonaInputSchema>;

const agentTaskInputSchema = z
  .object({
    agentProfile: z.string().trim().min(1).max(80),
    delegatePersonaUuid: z.string().length(16).nullable().default(null),
    dependsOn: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    key: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]*$/u)
      .max(80),
    objective: z.string().trim().min(3).max(4_000),
    scopePaths: z.array(z.string().trim().min(1).max(500)).min(1).max(50),
    title: z.string().trim().min(1).max(240)
  })
  .strict();

export const agentDecompositionInputSchema = z
  .object({
    supervisorPersonaUuid: z.string().length(16).nullable().default(null),
    tasks: z.array(agentTaskInputSchema).min(1).max(20)
  })
  .strict();

export const agentTaskStatusInputSchema = z
  .object({
    resultSummary: z.string().trim().max(8_000).default(""),
    status: z.enum(["completed", "failed"])
  })
  .strict();

export const agentPersonaAssignmentSchema = z
  .object({ personaUuid: z.string().length(16) })
  .strict();

export const agentParentReviewInputSchema = z
  .object({
    decision: z.enum(["approved", "rework"]),
    note: z.string().trim().min(3).max(4_000)
  })
  .strict();

export type AgentDecompositionInput = z.infer<typeof agentDecompositionInputSchema>;
