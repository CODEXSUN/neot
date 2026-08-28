import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { AppError } from "@neot/framework/errors";

export type CodexNotification = {
  id?: number;
  result?: unknown;
  error?: { code?: number; message?: string };
  method?: string;
  params?: unknown;
};

type NotificationListener = (message: CodexNotification) => void;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

type CodexAccess = "plan" | "read-only" | "ask-approval" | "auto-approve" | "full-access";

type CodexUserInput = { type: "text"; text: string } | { type: "image"; url: string };

export type CodexAccountStatus = {
  available: boolean;
  connected: boolean;
  accountType: string | null;
  email: string | null;
  planType: string | null;
  error: string | null;
};

export type CodexMcpServerList = {
  data?: unknown[];
  items?: unknown[];
  nextCursor?: string | null;
};

export class CodexAppServerClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly listeners = new Set<NotificationListener>();
  private readonly approvalRequests = new Map<number, string>();
  private readonly threadAccess = new Map<string, CodexAccess>();
  private startup: Promise<void> | null = null;
  private lastError: string | null = null;

  constructor(
    readonly connectionId: string,
    private readonly codexHome: string
  ) {
    mkdirSync(this.codexHome, { recursive: true });
  }

  async status(): Promise<CodexAccountStatus> {
    try {
      await this.ensureStarted();
      const result = (await this.request("account/read", { refreshToken: false })) as {
        account?: { type?: string; email?: string | null; planType?: string | null } | null;
      };
      return {
        available: true,
        connected: Boolean(result.account),
        accountType: result.account?.type ?? null,
        email: result.account?.email ?? null,
        planType: result.account?.planType ?? null,
        error: null
      };
    } catch (error) {
      return {
        available: false,
        connected: false,
        accountType: null,
        email: null,
        planType: null,
        error: error instanceof Error ? error.message : "Codex App Server is unavailable."
      };
    }
  }

  async startDeviceLogin() {
    await this.ensureStarted();
    return this.request("account/login/start", { type: "chatgptDeviceCode" }) as Promise<{
      type: "chatgptDeviceCode";
      loginId: string;
      verificationUrl: string;
      userCode: string;
    }>;
  }

  async startBrowserLogin() {
    await this.ensureStarted();
    return this.request("account/login/start", {
      type: "chatgpt",
      useHostedLoginSuccessPage: true,
      appBrand: "chatgpt"
    }) as Promise<{
      type: "chatgpt";
      loginId: string;
      authUrl: string;
    }>;
  }

  async logout() {
    await this.ensureStarted();
    await this.request("account/logout", {});
  }

  async loginApiKey(apiKey: string) {
    await this.stop();
    mkdirSync(this.codexHome, { recursive: true });
    const command = resolveCodexCommand([
      "login",
      "--with-api-key",
      "-c",
      'cli_auth_credentials_store="file"'
    ]);
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command.executable, command.args, {
        cwd: process.cwd(),
        env: { ...process.env, CODEX_HOME: this.codexHome },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      });
      let errorOutput = "";
      child.stderr.on("data", (chunk: Buffer) => {
        errorOutput = `${errorOutput}${chunk.toString("utf8")}`.slice(-1_000);
      });
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(errorOutput.trim() || `Codex API key login failed (${code}).`));
      });
      child.stdin.end(`${apiKey}\n`);
    });
    return this.status();
  }

  async stop() {
    const child = this.process;
    this.process = null;
    this.startup = null;
    if (!child || child.killed) return;
    child.kill();
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 2_000);
      timeout.unref();
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  async reloadMcpServers() {
    await this.ensureStarted();
    return this.request("config/mcpServer/reload", {});
  }

  async listMcpServers() {
    await this.ensureStarted();
    return this.request("mcpServerStatus/list", {
      detail: "toolsAndAuthOnly",
      limit: 100
    }) as Promise<CodexMcpServerList>;
  }

  async cancelLogin(loginId: string) {
    await this.ensureStarted();
    await this.request("account/login/cancel", { loginId });
  }

  async startThread(cwd: string, model: string, access: CodexAccess) {
    await this.ensureStarted();
    const result = (await this.request("thread/start", {
      cwd,
      model,
      approvalPolicy: approvalPolicy(access),
      approvalsReviewer: access === "auto-approve" ? "auto_review" : "user",
      sandbox: sandboxMode(access),
      serviceName: "neot_neot"
    })) as { thread: { id: string } };
    this.threadAccess.set(result.thread.id, access);
    return result.thread.id;
  }

  async startTurn(
    threadId: string,
    cwd: string,
    input: CodexUserInput[],
    model: string,
    access: CodexAccess
  ) {
    await this.ensureStarted();
    const result = (await this.request("turn/start", {
      threadId,
      input,
      cwd,
      model,
      approvalPolicy: approvalPolicy(access),
      approvalsReviewer: access === "auto-approve" ? "auto_review" : "user",
      sandboxPolicy: sandboxPolicy(access, cwd)
    })) as { turn: { id: string } };
    return result.turn.id;
  }

  async interruptTurn(threadId: string, turnId: string) {
    await this.ensureStarted();
    await this.request("turn/interrupt", { threadId, turnId });
  }

  resolveApproval(
    threadId: string,
    requestId: number,
    decision: "accept" | "acceptForSession" | "decline"
  ) {
    if (this.approvalRequests.get(requestId) !== threadId) {
      throw AppError.notFound("The Codex approval request is no longer pending.");
    }
    this.approvalRequests.delete(requestId);
    this.process?.stdin.write(`${JSON.stringify({ id: requestId, result: { decision } })}\n`);
  }

  ownsApproval(threadId: string, requestId: number) {
    return this.approvalRequests.get(requestId) === threadId;
  }

  subscribe(listener: NotificationListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async ensureStarted() {
    if (this.process && !this.process.killed) return;
    if (!this.startup) this.startup = this.start();
    try {
      await this.startup;
    } finally {
      this.startup = null;
    }
  }

  private async start() {
    const command = resolveCodexCommand(["app-server", "-c", 'cli_auth_credentials_store="file"']);
    mkdirSync(this.codexHome, { recursive: true });
    const child = spawn(command.executable, command.args, {
      cwd: process.cwd(),
      env: { ...process.env, CODEX_HOME: this.codexHome },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    this.process = child;
    createInterface({ input: child.stdout }).on("line", (line) => this.handleLine(line));
    child.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString("utf8").trim();
      if (message) this.lastError = message.slice(-500);
    });
    child.on("exit", () => this.failPending("Codex App Server stopped."));
    child.on("error", (error) => this.failPending(error.message));

    await new Promise<void>((resolve, reject) => {
      child.once("spawn", resolve);
      child.once("error", reject);
    }).catch((error: unknown) => {
      throw new AppError({
        code: "CODEX_APP_SERVER_UNAVAILABLE",
        message: `Unable to start Codex App Server with ${command.label}: ${error instanceof Error ? error.message : "unknown error"}`,
        statusCode: 503
      });
    });

    await this.request("initialize", {
      clientInfo: { name: "neot_neot", title: "NEOT NEOT", version: "1.0.22" }
    });
    this.notify("initialized", {});
  }

  private request(method: string, params: unknown) {
    if (!this.process?.stdin.writable) {
      return Promise.reject(new Error(this.lastError || "Codex App Server is not writable."));
    }
    const id = this.nextId++;
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        const pending = this.pending.get(id);
        if (!pending) return;
        this.pending.delete(id);
        reject(new Error(`Codex App Server request timed out: ${method}`));
      }, 15_000).unref();
    });
    this.process.stdin.write(`${JSON.stringify({ method, id, params })}\n`);
    return promise;
  }

  private notify(method: string, params: unknown) {
    this.process?.stdin.write(`${JSON.stringify({ method, params })}\n`);
  }

  private handleLine(line: string) {
    let message: CodexNotification;
    try {
      message = JSON.parse(line) as CodexNotification;
    } catch {
      return;
    }
    if (message.method && typeof message.id !== "number") {
      for (const listener of this.listeners) listener(message);
      return;
    }
    if (message.method && typeof message.id === "number") {
      this.handleServerRequest(message);
      return;
    }
    if (typeof message.id !== "number") return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new Error(message.error.message || "Codex App Server request failed."));
    } else {
      pending.resolve(message.result);
    }
  }

  private handleServerRequest(message: CodexNotification) {
    const params = message.params as { threadId?: string } | undefined;
    const threadId = params?.threadId;
    const interactiveApproval =
      message.method === "item/commandExecution/requestApproval" ||
      message.method === "item/fileChange/requestApproval";
    if (threadId && this.threadAccess.get(threadId) === "ask-approval" && interactiveApproval) {
      this.approvalRequests.set(message.id as number, threadId);
      for (const listener of this.listeners) listener(message);
      return;
    }
    if (threadId && this.threadAccess.get(threadId) === "auto-approve" && interactiveApproval) {
      this.process?.stdin.write(
        `${JSON.stringify({ id: message.id, result: { decision: "acceptForSession" } })}\n`
      );
      return;
    }
    const result = message.method?.includes("requestApproval")
      ? { decision: "decline" }
      : { action: "decline", content: null };
    this.process?.stdin.write(`${JSON.stringify({ id: message.id, result })}\n`);
  }

  private failPending(message: string) {
    this.lastError = message;
    this.process = null;
    for (const pending of this.pending.values()) pending.reject(new Error(message));
    this.pending.clear();
  }
}

function approvalPolicy(access: CodexAccess) {
  return access === "ask-approval" || access === "auto-approve" ? "on-request" : "never";
}

function sandboxMode(access: CodexAccess) {
  if (access === "full-access") return "danger-full-access";
  if (access === "ask-approval" || access === "auto-approve") return "workspace-write";
  return "read-only";
}

function sandboxPolicy(access: CodexAccess, cwd: string) {
  if (access === "full-access") return { type: "dangerFullAccess" };
  if (access === "ask-approval" || access === "auto-approve") {
    return {
      type: "workspaceWrite",
      writableRoots: [cwd],
      networkAccess: false,
      excludeTmpdirEnvVar: false,
      excludeSlashTmp: false
    };
  }
  return { type: "readOnly", networkAccess: false };
}

export function resolveNEOTCodexHome(connectionId: string) {
  const configured = process.env.NEOT_CODEX_HOME?.trim();
  if (configured) {
    return connectionId === "primary" ? configured : join(configured, "connections", connectionId);
  }
  const applicationData = process.env.LOCALAPPDATA?.trim() || process.cwd();
  const base = join(applicationData, "NEOT", "NEOT", "codex");
  return connectionId === "primary" ? base : join(base, "connections", connectionId);
}

function resolveCodexCommand(subcommand: string[]) {
  const configured = process.env.CODEX_EXECUTABLE?.trim() || "bundled";
  if (configured === "bundled") {
    const require = createRequire(import.meta.url);
    const script = require.resolve("@openai/codex/bin/codex.js");
    return {
      executable: process.execPath,
      args: [script, ...subcommand],
      label: "bundled Codex CLI"
    };
  }
  if (configured.toLowerCase().endsWith(".js")) {
    return { executable: process.execPath, args: [configured, ...subcommand], label: configured };
  }
  return { executable: configured, args: subcommand, label: configured };
}
