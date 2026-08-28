import type { AgentAccess } from "../contracts/desktop";

export const AGENT_DISCUSSION_ACCESS: AgentAccess = "readOnly";

export function discussionPrompt(prompt: string) {
  return [
    "You are in NEOT's Agent Discussion workspace.",
    "This is a read-only conversation for understanding, planning, reviewing, and discussing the overall repository.",
    "Do not create, edit, delete, rename, or write files. Do not start coding work, create a worktree, or claim that code was changed.",
    "If the user wants implementation, direct them to Projects, ask them to select the project, and open its Coder Agent.",
    "You may inspect available repository context and explain findings clearly.",
    "",
    `User discussion: ${prompt}`
  ].join("\n");
}
