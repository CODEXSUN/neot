import { tool } from "@openai/agents";
import { z } from "zod";

const launchContextSchema = z.object({
  brief: z.string(),
  audience: z.string(),
  launchDate: z.string(),
  constraints: z.string(),
  assets: z.array(z.string())
});

export const extractLaunchTasksTool = tool({
  name: "extract_launch_tasks",
  description:
    "Extract prioritized engineering, product, marketing, support, and measurement tasks from a launch brief.",
  parameters: launchContextSchema,
  execute: ({ brief, audience, launchDate, constraints, assets }) => ({
    launchDate,
    workstreams: [
      "release scope and quality",
      "audience and positioning",
      "channel execution",
      "support readiness",
      "measurement and rollback"
    ],
    evidence: { brief, audience, constraints, assets },
    rule: "Order blockers and dependencies before channel execution."
  })
});

export const checkLaunchReadinessTool = tool({
  name: "check_launch_readiness",
  description: "Check launch readiness against a fixed rubric and identify missing evidence.",
  parameters: launchContextSchema,
  execute: ({ brief, audience, launchDate, constraints, assets }) => {
    const checks = [
      { key: "scope", ready: brief.length >= 80 },
      { key: "audience", ready: audience.length >= 20 },
      { key: "date", ready: Boolean(launchDate) },
      { key: "constraints", ready: constraints.length >= 10 },
      { key: "assets", ready: assets.length > 0 },
      { key: "rollback", ready: /rollback|revert|feature flag/i.test(`${brief} ${constraints}`) },
      { key: "measurement", ready: /metric|analytics|conversion|adoption|success/i.test(brief) }
    ];
    return { checks, missing: checks.filter((check) => !check.ready).map((check) => check.key) };
  }
});

export const generateOwnerChecklistTool = tool({
  name: "generate_owner_checklist",
  description: "Generate accountable owner lanes and required approval checkpoints.",
  parameters: launchContextSchema,
  execute: ({ launchDate }) => ({
    launchDate,
    ownerLanes: ["Engineering", "Product", "Marketing", "Support", "Analytics", "Release approver"],
    approvalRule:
      "Production release, rollback, customer communication, and scope changes require named human approval."
  })
});

export const draftLaunchCopyTool = tool({
  name: "draft_channel_copy",
  description:
    "Provide channel-specific copy constraints for release notes, email, in-product, and social drafts.",
  parameters: launchContextSchema,
  execute: ({ audience, brief }) => ({
    audience,
    sourceBrief: brief,
    channels: {
      releaseNotes: "Outcome first; include availability, limitations, and support path.",
      email: "One promise, three proof points, one call to action.",
      inProduct: "Short benefit statement plus a direct next action.",
      social: "One concrete outcome, no unsupported superlatives, link to details."
    }
  })
});

export const launchDeskTools = [
  extractLaunchTasksTool,
  checkLaunchReadinessTool,
  generateOwnerChecklistTool,
  draftLaunchCopyTool
];
