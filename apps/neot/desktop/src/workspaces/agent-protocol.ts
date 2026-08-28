import type { AgentProtocolMessage } from "../contracts/desktop";
import type { RunItem } from "./agent-workspace-parts";
import { z } from "zod";

const messageRecord = z.record(z.string(), z.unknown());
const agentProtocolMessageSchema = z
  .object({
    id: z.number().optional(),
    method: z.string().optional(),
    params: messageRecord.optional(),
    result: messageRecord.optional(),
    error: z.object({ message: z.string().optional() }).passthrough().optional()
  })
  .passthrough();

export function parseAgentProtocolMessage(value: unknown): AgentProtocolMessage | undefined {
  const parsed = agentProtocolMessageSchema.safeParse(value);
  if (!parsed.success) return undefined;
  const message: AgentProtocolMessage = {};
  if (parsed.data.id !== undefined) message.id = parsed.data.id;
  if (parsed.data.method !== undefined) message.method = parsed.data.method;
  if (parsed.data.params !== undefined) message.params = parsed.data.params;
  if (parsed.data.result !== undefined) message.result = parsed.data.result;
  if (parsed.data.error?.message !== undefined) {
    message.error = { message: parsed.data.error.message };
  }
  return message;
}

export function agentErrorFrom(value: unknown) {
  const message = parseAgentProtocolMessage(value);
  if (!message) return undefined;
  const protocolError = message.error?.message?.trim();
  if (protocolError) return protocolError;
  const nestedError =
    textAt(message, "params", "error", "message") ??
    textAt(message, "params", "turn", "error", "message");
  if (nestedError?.trim()) return nestedError.trim();
  if (message.method !== "runtime/error") return undefined;
  const runtimeError = textAt(message, "params", "message")?.trim();
  return runtimeError || undefined;
}

export function threadIdFrom(message: AgentProtocolMessage) {
  return textAt(message, "result", "thread", "id") ?? textAt(message, "params", "thread", "id") ?? textAt(message, "params", "threadId");
}

export function actionChoicesFrom(text: string | undefined) {
  if (!text?.includes("?")) return [];
  const choices = text
    .split("\n")
    .map((line) => line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+?)\s*$/)?.[1])
    .filter((choice): choice is string => Boolean(choice))
    .map((choice) => choice.replace(/[*_`]/g, "").trim())
    .filter((choice) => choice.length > 0 && choice.length <= 80);
  const unique = [...new Set(choices)];
  if (unique.length >= 2 && unique.length <= 6) return unique;
  return booleanChoicesFrom(text);
}

export function choiceQuestionFrom(text: string | undefined) {
  if (!actionChoicesFrom(text).length) return text ?? "";
  return text
    ?.split("\n")
    .filter((line) => !/^\s*(?:[-*]|\d+[.)])\s+.+?\s*$/.test(line))
    .join("\n")
    .trim() ?? "";
}

export function asksForTextInput(text: string | undefined) {
  return Boolean(text && /\?\s*$/.test(choiceQuestionFrom(text)));
}

export function textAt(value: unknown, ...path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    current =
      typeof current === "object" && current !== null
        ? (current as Record<string, unknown>)[key]
        : undefined;
  }
  return typeof current === "string" ? current : undefined;
}

export function extractTextFromAny(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map(extractTextFromAny).filter(Boolean).join("");
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.delta === "string") return obj.delta;
    if (typeof obj.content === "string") return obj.content;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.value === "string") return obj.value;
    if (obj.text) return extractTextFromAny(obj.text);
    if (obj.delta) return extractTextFromAny(obj.delta);
    if (obj.content) return extractTextFromAny(obj.content);
    if (obj.message) return extractTextFromAny(obj.message);
    if (obj.output) return extractTextFromAny(obj.output);
    if (obj.result) return extractTextFromAny(obj.result);
    if (obj.items) return extractTextFromAny(obj.items);
  }
  return "";
}

export function extractTextAt(value: unknown, ...path: string[]): string {
  let current: unknown = value;
  for (const key of path) {
    current =
      typeof current === "object" && current !== null
        ? (current as Record<string, unknown>)[key]
        : undefined;
  }
  return extractTextFromAny(current);
}

export function runItemFrom(message: AgentProtocolMessage): RunItem | undefined {
  const item = valueAt(message, "params", "item");
  if (!item) return undefined;
  const id = stringValue(item.id) ?? crypto.randomUUID();
  const type = stringValue(item.type) ?? "activity";
  if (!["commandExecution", "fileChange", "mcpToolCall", "webSearch"].includes(type)) {
    return undefined;
  }
  const label = stringValue(item.command) ?? stringValue(item.tool) ?? labelFor(type);
  const status =
    stringValue(item.status) ?? (message.method === "item/completed" ? "completed" : "running");
  return { id, label, status, type };
}

function valueAt(value: unknown, ...path: string[]): Record<string, unknown> | undefined {
  let current: unknown = value;
  for (const key of path) {
    current =
      typeof current === "object" && current !== null
        ? (current as Record<string, unknown>)[key]
        : undefined;
  }
  return typeof current === "object" && current !== null
    ? (current as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function booleanChoicesFrom(text: string) {
  const normalized = text.toLowerCase();
  if (/\byes\b\s*(?:or|\/)\s*\bno\b/.test(normalized)) return ["Yes", "No"];
  if (/\btrue\b\s*(?:or|\/)\s*\bfalse\b/.test(normalized)) return ["True", "False"];
  if (/\by\b\s*(?:or|\/)\s*\bn\b/.test(normalized)) return ["Y", "N"];
  return [];
}

function labelFor(type: string) {
  return (
    {
      fileChange: "Editing workspace files",
      mcpToolCall: "Using connected tool",
      webSearch: "Searching the web"
    } as Record<string, string>
  )[type] ?? "Agent activity";
}
