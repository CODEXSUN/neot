import { AppError } from "@neot/framework/errors";
import {
  CodexAppServerClient,
  type CodexAccountStatus,
  resolveNEOTCodexHome
} from "./codex-app-server.client.js";

export const codexConnectionIds = ["primary", "secondary"] as const;
export type CodexConnectionId = (typeof codexConnectionIds)[number];

export type CodexConnectionStatus = CodexAccountStatus & {
  default: boolean;
  id: CodexConnectionId;
  label: string;
};

export class CodexConnectorPool {
  private readonly clients = new Map<CodexConnectionId, CodexAppServerClient>();
  private roundRobinIndex = 0;

  constructor() {
    for (const id of codexConnectionIds) {
      this.clients.set(id, new CodexAppServerClient(id, resolveNEOTCodexHome(id)));
    }
  }

  client(id: CodexConnectionId) {
    const client = this.clients.get(id);
    if (!client) throw AppError.validation(`Unknown Codex connector: ${id}.`);
    return client;
  }

  primary() {
    return this.client("primary");
  }

  async statuses(): Promise<CodexConnectionStatus[]> {
    return Promise.all(
      codexConnectionIds.map(async (id) => ({
        ...(await this.client(id).status()),
        default: id === "primary",
        id,
        label: id === "primary" ? "Primary Codex" : "Secondary Codex"
      }))
    );
  }

  async nextConnected(preferred?: CodexConnectionId) {
    const statuses = await this.statuses();
    const connected = statuses.filter((status) => status.connected);
    if (!connected.length) {
      throw new AppError({
        code: "CODEX_CONNECTION_REQUIRED",
        message: "Connect at least one Codex connector before starting an Agent.",
        statusCode: 503
      });
    }
    if (preferred) {
      const match = connected.find((status) => status.id === preferred);
      if (match) return match.id;
    }
    const selected = connected[this.roundRobinIndex % connected.length]!;
    this.roundRobinIndex += 1;
    return selected.id;
  }

  resolveApproval(
    threadId: string,
    requestId: number,
    decision: "accept" | "acceptForSession" | "decline"
  ) {
    for (const client of this.clients.values()) {
      if (!client.ownsApproval(threadId, requestId)) continue;
      client.resolveApproval(threadId, requestId, decision);
      return;
    }
    throw AppError.notFound("The Codex approval request is no longer pending.");
  }
}

export function parseCodexConnectionId(value: unknown): CodexConnectionId {
  if (value === "primary" || value === "secondary") return value;
  throw AppError.validation("Codex connector must be primary or secondary.");
}

export const codexConnectorPool = new CodexConnectorPool();
export const codexAppServer = codexConnectorPool.primary();
