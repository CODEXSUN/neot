import type { CodexNotification } from "./codex-app-server.client.js";

export type OrchestrationChatAction = {
  id: string;
  label: string;
  status: "completed" | "failed" | "running";
  type: "command" | "compaction" | "file" | "search" | "subagent" | "tool";
};

const observableTypes = new Set([
  "collabAgentToolCall",
  "commandExecution",
  "contextCompaction",
  "dynamicToolCall",
  "fileChange",
  "mcpToolCall",
  "subAgentActivity",
  "webSearch"
]);

export function chatActionFrom(
  notification: CodexNotification,
  threadId: string
): OrchestrationChatAction | null {
  const params = recordValue(notification.params);
  if (params?.threadId !== threadId) return null;
  if (notification.method === "thread/compacted") {
    return {
      id: `compaction-${stringValue(params.turnId) ?? "thread"}`,
      label: "Context automatically compacted",
      status: "completed",
      type: "compaction"
    };
  }
  if (notification.method !== "item/started" && notification.method !== "item/completed") {
    return null;
  }
  const item = recordValue(params.item);
  const itemType = stringValue(item?.type);
  if (!item || !itemType || !observableTypes.has(itemType)) return null;
  return {
    id: stringValue(item.id) ?? `${itemType}-${stringValue(params.turnId) ?? "turn"}`,
    label: actionLabel(itemType, item),
    status: actionStatus(notification.method, stringValue(item.status)),
    type: actionType(itemType)
  };
}

export function upsertChatAction(
  actions: OrchestrationChatAction[],
  action: OrchestrationChatAction
) {
  return [...actions.filter((entry) => entry.id !== action.id), action];
}

function actionLabel(itemType: string, item: Record<string, unknown>) {
  if (itemType === "commandExecution") return compactLabel(stringValue(item.command), "Run command");
  if (itemType === "mcpToolCall") {
    const server = stringValue(item.server);
    const tool = stringValue(item.tool);
    return compactLabel([server, tool].filter(Boolean).join(" · "), "Use connected tool");
  }
  if (itemType === "dynamicToolCall") {
    return compactLabel(stringValue(item.tool), "Use agent tool");
  }
  if (itemType === "collabAgentToolCall") {
    return compactLabel(stringValue(item.tool), "Coordinate delegate agent");
  }
  if (itemType === "subAgentActivity") return "Delegate agent activity";
  if (itemType === "contextCompaction") return "Context automatically compacted";
  if (itemType === "fileChange") return "Apply workspace file changes";
  return "Search the web";
}

function actionStatus(method: string, status: string | undefined) {
  if (status === "failed" || status === "declined") return "failed" as const;
  if (method === "item/completed" || status === "completed") return "completed" as const;
  return "running" as const;
}

function actionType(itemType: string): OrchestrationChatAction["type"] {
  if (itemType === "commandExecution") return "command";
  if (itemType === "contextCompaction") return "compaction";
  if (itemType === "fileChange") return "file";
  if (itemType === "webSearch") return "search";
  if (itemType === "collabAgentToolCall" || itemType === "subAgentActivity") return "subagent";
  return "tool";
}

function compactLabel(value: string | undefined, fallback: string) {
  const label = value?.replace(/\s+/gu, " ").trim() || fallback;
  return label.length > 320 ? `${label.slice(0, 317)}…` : label;
}

function recordValue(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
