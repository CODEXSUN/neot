export type HoneyAction = {
  href?: string;
  id: "explain-error" | "open-project" | "review-deployment" | "start-agent" | "view-task";
  label: string;
  prompt?: string;
};
export type HoneyMessage = { actions?: HoneyAction[]; body: string; createdAt: string; id: string; role: "assistant" | "user" };
export type HoneyConversation = { id: string; messages: HoneyMessage[]; title: string };
export type HoneyConversationSummary = { id: string; title: string; updatedAt: string };
export type HoneyPageContext = { pageLabel: string; pathname: string; projectId: string | null; projectTitle: string | null; recentError: string | null; runStatus: string | null; taskId: string | null };
export type HoneyKnowledge = { content: string; createdAt: string; id: string; kind: string; reviewNote: string; source: string; status: "approved" | "pending" | "rejected" | "reverted"; version: number };
export type HoneyDashboard = { approvedSkills: string[]; conversationReview: HoneyConversationSummary[]; conversations: number; knowledge: HoneyKnowledge[]; reports: { approved: number; pending: number; unresolved: number } };
