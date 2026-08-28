import { apiGet, apiPost, apiPut } from "../../shared/api/neot-api";
import type {
  HoneyConversation,
  HoneyConversationSummary,
  HoneyDashboard,
  HoneyPageContext
} from "./honey.types";

export const listHoneyConversations = () =>
  apiGet<HoneyConversationSummary[]>("/honey/conversations");
export const getHoneyConversation = (id: string) =>
  apiGet<HoneyConversation>(`/honey/conversations/${id}`);
export const archiveHoneyConversation = (id: string) =>
  apiPut<{ archived: true; id: string }>(`/honey/conversations/${id}/archive`);
export const sendHoneyMessage = (
  message: string,
  threadId: string | null,
  context = readHoneyPageContext()
) => apiPost<HoneyConversation>("/honey/chat", { context, message, threadId });
export const getHoneyDashboard = () => apiGet<HoneyDashboard>("/honey/dashboard");
export const reviewHoneyKnowledge = (id: string, status: "approved" | "rejected" | "reverted") =>
  apiPut<HoneyDashboard["knowledge"]>(`/honey/memory/${id}`, {
    note: "Reviewed in Honey dashboard",
    status
  });

export function readHoneyPageContext(): HoneyPageContext {
  const search = new URLSearchParams(window.location.search);
  const previousPage = window.sessionStorage.getItem("neot.honey.last-page");
  return {
    pageLabel: document.title || window.location.pathname,
    pathname: previousPage || `${window.location.pathname}${window.location.search}`,
    projectId: search.get("project"),
    projectTitle: search.get("projectTitle"),
    recentError: window.sessionStorage.getItem("neot.honey.recent-error"),
    runStatus: search.get("runStatus"),
    taskId: search.get("task") ?? search.get("issue")
  };
}

export const honeyChatClient = {
  href: "/app/neot/honey",
  load: async (threadId: string | null) => {
    if (threadId) return getHoneyConversation(threadId);
    const latest = (await listHoneyConversations())[0];
    return latest ? getHoneyConversation(latest.id) : null;
  },
  send: sendHoneyMessage
};
