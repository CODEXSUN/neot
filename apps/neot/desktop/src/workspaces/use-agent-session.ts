import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type { AgentConfig, AgentMessage, AgentProtocolMessage, AgentProvider, AgentReasoningEffort, AgentTask } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import type { Approval, RunItem } from "./agent-workspace-parts";
import {
  agentErrorFrom,
  extractTextAt,
  parseAgentProtocolMessage,
  runItemFrom,
  textAt,
  threadIdFrom
} from "./agent-protocol";
import { AgentTurnWatchdog } from "./agent-turn-watchdog";
import { afterFirstPaint } from "../shell/startup-scheduler";
import { measureDesktopOperation, recordDesktopPerformance } from "../shell/desktop-performance";
import { AGENT_DISCUSSION_ACCESS, discussionPrompt } from "./agent-discussion-policy";
import { groupAgentMessages, mergeAgentText, type ConversationMessage } from "./agent-conversation";

export type ChatMessage = ConversationMessage;
export type SubmissionPhase = "idle" | "preparing" | "sending";

export type AgentConnection = {
  effort: AgentReasoningEffort;
  id: AgentProvider;
  model: string;
  provider: string;
};

export function useAgentSession({ onRefreshChanges }: { onRefreshChanges: () => Promise<void> }) {
  const [activeTaskId, setActiveTaskId] = useState<number>();
  const [approval, setApproval] = useState<Approval>();
  const [composer, setComposer] = useState("");
  const [connection, setConnection] = useState<AgentConnection>({ effort: "low", id: "codex", model: "gpt-5.6-terra", provider: "Codex" });
  const [diff, setDiff] = useState("");
  const [error, setError] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runItems, setRunItems] = useState<RunItem[]>([]);
  const [running, setRunning] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase>("idle");
  const [runtime, setRuntime] = useState<"idle" | "connecting" | "ready" | "unavailable">("idle");
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [threadId, setThreadId] = useState<string>();
  const [, setTurnId] = useState<string>();

  const activeTaskIdRef = useRef<number | undefined>(undefined);
  const threadIdRef = useRef<string | undefined>(undefined);
  const turnIdRef = useRef<string | undefined>(undefined);
  const pendingAgentTextRef = useRef("");
  const pendingAgentTextFrameRef = useRef<number | undefined>(undefined);
  const renderedAgentTextBatchesRef = useRef(0);
  const runtimeRef = useRef<"idle" | "connecting" | "ready" | "unavailable">("idle");
  const runtimeRequestRef = useRef<Promise<void> | undefined>(undefined);
  const threadRequestRef = useRef<Promise<string> | undefined>(undefined);
  const resolveThreadRef = useRef<((threadId: string) => void) | undefined>(undefined);
  const threadTimeoutRef = useRef<number | undefined>(undefined);
  const transcript = useRef<HTMLDivElement>(null);
  const turnEventCountRef = useRef(0);
  const turnStartedAtRef = useRef<number | undefined>(undefined);
  const watchdogRef = useRef<AgentTurnWatchdog | undefined>(undefined);
  const busy = running || submissionPhase !== "idle";

  watchdogRef.current ??= new AgentTurnWatchdog({
    onRecovered: () => setStalled(false),
    onStalled: () => setStalled(true),
    onTimeout: () => {
      setStalled(false);
      setError(
        "The agent produced no activity for three minutes, so NEOT stopped the turn. Send a follow-up to continue."
      );
      const currentThreadId = threadIdRef.current;
      const currentTurnId = turnIdRef.current;
      if (currentThreadId && currentTurnId) {
        void desktopClient.interruptAgentTurn(currentThreadId, currentTurnId).catch((reason) => {
          setError(`The stalled turn could not be stopped. ${String(reason)}`);
        });
      }
    }
  });

  useEffect(() => {
    let disposed = false;
    let cancelHistoryLoad: (() => void) | undefined;
    let stopEvents: (() => void) | undefined;
    let stopErrors: (() => void) | undefined;

    void Promise.all([
      listen<unknown>("agent-event", (event) => {
        const message = parseAgentProtocolMessage(event.payload);
        if (message) handleAgentEvent(message);
      }),
      listen<unknown>("agent-error", (event) => {
        const message = agentErrorFrom(event.payload);
        if (message) setError(message);
      })
    ]).then(([events, errors]) => {
      if (disposed) {
        events();
        errors();
        return;
      }
      stopEvents = events;
      stopErrors = errors;
      cancelHistoryLoad = afterFirstPaint(() => {
        void measureDesktopOperation("agent", "Load agent configuration", () =>
          desktopClient.getAgentConfig()
        )
          .then((config) => setConnection(connectionFrom(config)))
          .catch(() => undefined);
        void loadTaskHistory();
      });
    });

    return () => {
      disposed = true;
      cancelHistoryLoad?.();
      if (pendingAgentTextFrameRef.current !== undefined) {
        window.cancelAnimationFrame(pendingAgentTextFrameRef.current);
      }
      watchdogRef.current?.stop();
      stopEvents?.();
      stopErrors?.();
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = transcript.current;
      if (!element) return;
      element.scrollTo({ behavior: running ? "auto" : "smooth", top: element.scrollHeight });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, runItems, running]);

  function handleAgentEvent(message: AgentProtocolMessage) {
    watchdogRef.current?.touch();
    if (turnStartedAtRef.current !== undefined) turnEventCountRef.current += 1;
    const nextThread = threadIdFrom(message);
    if (nextThread) {
      threadIdRef.current = nextThread;
      setThreadId(nextThread);
      resolveThreadRef.current?.(nextThread);
      resolveThreadRef.current = undefined;
      threadRequestRef.current = undefined;
      window.clearTimeout(threadTimeoutRef.current);
      threadTimeoutRef.current = undefined;
    }
    if (message.method === "turn/started") {
      turnStartedAtRef.current = performance.now();
      turnEventCountRef.current = 1;
      renderedAgentTextBatchesRef.current = 0;
      const nextTurnId = textAt(message, "params", "turn", "id");
      turnIdRef.current = nextTurnId;
      setTurnId(nextTurnId);
      setRunning(true);
      watchdogRef.current?.start();

    }
    if (
      message.method === "item/agentMessage/delta" ||
      message.method === "turn/delta" ||
      message.method === "message/delta"
    ) {
      const deltaText =
        extractTextAt(message, "params", "delta") ||
        extractTextAt(message, "params", "text") ||
        extractTextAt(message, "params", "content") ||
        extractTextAt(message, "delta") ||
        extractTextAt(message, "text");
      if (deltaText) appendAgentText(deltaText);
    }
    if (
      message.method === "item/completed" ||
      message.method === "item/created" ||
      message.method === "item/updated" ||
      message.method === "item/started"
    ) {
      const itemType = textAt(message, "params", "item", "type") ?? textAt(message, "params", "type") ?? "";
      const isAgentMessage = !itemType || ["agentMessage", "agent_message", "message", "text", "output", "agent"].includes(itemType);

      if (isAgentMessage) {
        const text =
          extractTextAt(message, "params", "item", "text") ||
          extractTextAt(message, "params", "item", "content") ||
          extractTextAt(message, "params", "item", "message") ||
          extractTextAt(message, "params", "item", "delta") ||
          extractTextAt(message, "params", "item", "formattedText");
        if (text) {
          flushAgentText();
          const itemId = textAt(message, "params", "item", "id") ?? crypto.randomUUID();
          setAgentText(itemId, text);
          if (activeTaskIdRef.current) {
            void desktopClient.saveAgentMessage(activeTaskIdRef.current, itemId, "agent", text);
          }
        }
      }
    }
    if (message.method === "item/started" || message.method === "item/completed") {
      updateRunItem(message);
    }
    if (message.method === "turn/diff/updated") {
      setDiff(textAt(message, "params", "diff") ?? "");
    }
    if (
      ["item/commandExecution/requestApproval", "item/fileChange/requestApproval"].includes(
        message.method ?? ""
      ) &&
      message.id !== undefined
    ) {
      setApproval({
        id: message.id,
        command: textAt(message, "params", "command") ?? "Workspace file changes",
        reason: textAt(message, "params", "reason") ?? "NEOT needs permission to continue."
      });
    }
    if (message.method === "turn/completed") {
      flushAgentText();
      watchdogRef.current?.stop();
      setRunning(false);
      turnIdRef.current = undefined;
      setTurnId(undefined);

      const turnOutput =
        extractTextAt(message, "params", "turn", "output") ||
        extractTextAt(message, "params", "turn", "text") ||
        extractTextAt(message, "params", "turn", "result") ||
        extractTextAt(message, "params", "output") ||
        extractTextAt(message, "params", "text") ||
        extractTextAt(message, "params", "result");

      if (turnOutput) {
        const itemId = textAt(message, "params", "turn", "id") ?? crypto.randomUUID();
        setAgentText(itemId, turnOutput);
        if (activeTaskIdRef.current) {
          void desktopClient.saveAgentMessage(activeTaskIdRef.current, itemId, "agent", turnOutput);
        }
      }

      void onRefreshChanges();
      if (activeTaskIdRef.current) {
        void desktopClient.setAgentTaskStatus(activeTaskIdRef.current, "completed").then(updateTask);
      }
      recordTurnPerformance("Completed");
    }
    if (message.error?.message) {
      flushAgentText();
      setError(message.error.message);
      if (activeTaskIdRef.current) {
        void desktopClient.setAgentTaskStatus(activeTaskIdRef.current, "failed").then(updateTask);
      }
      recordTurnPerformance("Failed");
    }
  }

  async function send(submittedPrompt?: string) {
    const prompt = (submittedPrompt ?? composer).trim();
    if (!prompt || busy) return;
    if (!submittedPrompt) setComposer("");
    setError(undefined);
    setRunItems([]);
    setDiff("");
    const message = { id: crypto.randomUUID(), role: "user" as const, text: prompt };
    let savedMessage: { id: string; taskId: number } | undefined;
    try {
      setSubmissionPhase("preparing");
      setMessages((current) => [...current, { ...message, createdAt: new Date().toISOString() }]);
      const currentThreadId = await ensureThread();

      const task = await ensureTask(currentThreadId, prompt);
      const persistedMessage = await desktopClient.saveAgentMessage(
        task.id,
        message.id,
        message.role,
        message.text
      );
      savedMessage = { id: message.id, taskId: task.id };
      setMessages((current) => current.map((item) => item.id === message.id ? toChatMessage(persistedMessage) : item));
      setRunning(true);
      setSubmissionPhase("sending");
      const savedTask = await desktopClient.setAgentTaskStatus(task.id, "running");
      updateTask(savedTask);
      await measureDesktopOperation("agent", "Submit agent turn", () =>
        desktopClient.sendAgentTurn(task.id, currentThreadId, discussionPrompt(prompt), AGENT_DISCUSSION_ACCESS)
      );
    } catch (reason) {
      setRunning(false);
      const rollbackError = savedMessage
        ? await rollbackMessage(savedMessage.taskId, savedMessage.id)
        : undefined;
      if (!savedMessage) setMessages((current) => current.filter((item) => item.id !== message.id));
      if (!submittedPrompt) setComposer((current) => current || prompt);
      setError(
        rollbackError
          ? `The prompt was not sent, and its saved draft could not be removed. ${rollbackError}`
          : `The prompt was not sent. ${String(reason)}`
      );
    } finally {
      setSubmissionPhase("idle");
    }
  }

  async function newDiscussion() {
    if (busy) return;
    setActiveTask(undefined);
    resetConversation();
    try {
      await ensureThread();
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function openTask(task: AgentTask) {
    if (busy || task.id === activeTaskIdRef.current) return;
    setError(undefined);
    setThreadId(undefined);
    threadIdRef.current = undefined;
    setRunItems([]);
    setDiff("");
    setActiveTask(task.id);

    try {
      await ensureRuntime();
      const savedMessages = await measureDesktopOperation("agent", "Load chat history", () =>
        desktopClient.listAgentMessages(task.id)
      );
      if (task.id !== activeTaskIdRef.current) return;
      setMessages(groupAgentMessages(savedMessages.map(toChatMessage)));
      await measureDesktopOperation("agent", "Resume agent thread", () =>
        desktopClient.resumeAgentThread(task.id, task.threadId)
      );
      threadIdRef.current = task.threadId;
      setThreadId(task.threadId);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function archiveTask(task: AgentTask) {
    if (busy) return;
    await desktopClient.archiveAgentTask(task.id);
    removeTaskFromSession(task.id);
  }

  async function deleteTask(task: AgentTask) {
    if (busy) return;
    try {
      await desktopClient.deleteAgentTask(task.id);
      removeTaskFromSession(task.id);
    } catch (reason) {
      setError(`The chat could not be deleted. ${String(reason)}`);
      throw reason;
    }
  }

  async function requestTaskReview(task: AgentTask) {
    if (busy || task.reviewRequested) return;
    const saved = await desktopClient.requestAgentTaskReview(task.id);
    setTasks((current) => current.map((item) => item.id === saved.id ? saved : item));
  }

  async function renameTask(task: AgentTask, title: string) {
    if (busy) return;
    try {
      const saved = await desktopClient.renameAgentTask(task.id, title);
      setTasks((current) => current.map((item) => item.id === saved.id ? saved : item));
    } catch (reason) {
      setError(`The chat could not be renamed. ${String(reason)}`);
      throw reason;
    }
  }

  async function interrupt() {
    if (!running || !threadIdRef.current || !turnIdRef.current) return;
    try {
      await desktopClient.interruptAgentTurn(threadIdRef.current, turnIdRef.current);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function answerApproval(decision: string) {
    if (!approval) return;
    const currentApproval = approval;
    setApproval(undefined);
    try {
      await desktopClient.answerAgentApproval(currentApproval.id, decision);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function updateAgentPreferences(provider: AgentProvider, model: string, effort: AgentReasoningEffort) {
    if (busy) return;
    try {
      const config = await desktopClient.getAgentConfig();
      const providers = (Object.keys(config.providers) as AgentProvider[]).reduce<AgentConfig["providers"]>(
        (current, key) => ({
          ...current,
          [key]: { ...config.providers[key], isDefault: key === provider }
        }),
        {} as AgentConfig["providers"]
      );
      const saved = await desktopClient.saveAgentConfig({
        ...config,
        defaultProvider: provider,
        providers: {
          ...providers,
          [provider]: {
            ...providers[provider],
            enabled: true,
            isDefault: true,
            model,
            reasoningEffort: effort
          }
        }
      });
      setConnection(connectionFrom(saved));
    } catch (reason) {
      setError(`The provider preference could not be saved. ${String(reason)}`);
    }
  }

  async function ensureRuntime() {
    if (runtimeRef.current === "ready") return;
    if (runtimeRequestRef.current) return runtimeRequestRef.current;

    runtimeRef.current = "connecting";
    setRuntime("connecting");
    const request = measureDesktopOperation("agent", "Start local agent runtime", () =>
      desktopClient.startAgentRuntime()
    )
      .then(() => {
        runtimeRef.current = "ready";
        setRuntime("ready");
      })
      .catch((reason) => {
        runtimeRef.current = "unavailable";
        setRuntime("unavailable");
        throw new Error(`The local agent engine could not start. ${String(reason)}`, { cause: reason });
      })
      .finally(() => {
        runtimeRequestRef.current = undefined;
      });
    runtimeRequestRef.current = request;
    return request;
  }

  async function ensureThread() {
    await ensureRuntime();
    if (threadIdRef.current) return threadIdRef.current;
    if (threadRequestRef.current) return threadRequestRef.current;

    threadRequestRef.current = new Promise<string>((resolve, reject) => {
      resolveThreadRef.current = resolve;
      threadTimeoutRef.current = window.setTimeout(() => {
        threadRequestRef.current = undefined;
        resolveThreadRef.current = undefined;
        reject(new Error("The local agent process did not assign a thread ID in time."));
      }, 10000);
    });

    void measureDesktopOperation("agent", "Create agent thread", () => desktopClient.startAgentThread()).catch((reason) => {
      threadRequestRef.current = undefined;
      resolveThreadRef.current = undefined;
      window.clearTimeout(threadTimeoutRef.current);
      threadTimeoutRef.current = undefined;
      setError(String(reason));
    });

    return threadRequestRef.current;
  }

  async function ensureTask(currentThreadId: string, prompt: string) {
    if (activeTaskIdRef.current) {
      const activeTask = tasks.find((item) => item.id === activeTaskIdRef.current);
      if (activeTask) return activeTask;
    }
    const created = await measureDesktopOperation("agent", "Create discussion history", () =>
      desktopClient.saveAgentTask(currentThreadId, titleFrom(prompt), AGENT_DISCUSSION_ACCESS, "chat")
    );
    setActiveTask(created.id);
    setTasks((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }

  async function loadTaskHistory() {
    try {
      const existingTasks = await measureDesktopOperation("agent", "Load chat list", () =>
        desktopClient.listAgentTasks()
      );
      setTasks(existingTasks);
    } catch {
      // Keep UI active even if history is unavailable
    }
  }

  function setActiveTask(taskId: number | undefined) {
    activeTaskIdRef.current = taskId;
    setActiveTaskId(taskId);
  }

  function appendAgentText(delta: string) {
    if (!delta) return;
    pendingAgentTextRef.current += delta;
    if (pendingAgentTextFrameRef.current !== undefined) return;
    pendingAgentTextFrameRef.current = window.requestAnimationFrame(flushAgentText);
  }

  function flushAgentText() {
    if (pendingAgentTextFrameRef.current !== undefined) {
      window.cancelAnimationFrame(pendingAgentTextFrameRef.current);
    }
    pendingAgentTextFrameRef.current = undefined;
    const delta = pendingAgentTextRef.current;
    pendingAgentTextRef.current = "";
    if (!delta) return;
    renderedAgentTextBatchesRef.current += 1;
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.role === "agent") {
        return [
          ...current.slice(0, -1),
          { ...last, text: last.text + delta }
        ];
      }
      return [
        ...current,
        { createdAt: new Date().toISOString(), id: crypto.randomUUID(), role: "agent", text: delta }
      ];
    });
  }

  function setAgentText(id: string, text: string) {
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.role === "agent") return [...current.slice(0, -1), { ...last, text: mergeAgentText(last.text, text) }];
      return [...current, { createdAt: new Date().toISOString(), id, role: "agent", text }];
    });
  }

  function updateRunItem(message: AgentProtocolMessage) {
    const item = runItemFrom(message);
    if (!item) return;
    setRunItems((current) => {
      const existingIndex = current.findIndex((target) => target.id === item.id);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = item;
        return next;
      }
      return [...current, item];
    });
  }

  function resetConversation() {
    setMessages([]);
    setRunItems([]);
    setDiff("");
    setThreadId(undefined);
    setTurnId(undefined);
    threadIdRef.current = undefined;
    turnIdRef.current = undefined;
  }

  function removeTaskFromSession(taskId: number) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    if (activeTaskIdRef.current === taskId) {
      setActiveTask(undefined);
      resetConversation();
    }
  }

  function updateTask(saved: AgentTask) {
    setTasks((current) => current.map((task) => task.id === saved.id ? saved : task));
  }

  function recordTurnPerformance(outcome: string) {
    const startedAt = turnStartedAtRef.current;
    if (startedAt === undefined) return;
    recordDesktopPerformance({
      at: new Date().toISOString(),
      detail: `${outcome} · ${turnEventCountRef.current} events · ${renderedAgentTextBatchesRef.current} render batches`,
      durationMs: performance.now() - startedAt,
      operation: "Agent turn stream",
      phase: "agent"
    });
    turnStartedAtRef.current = undefined;
  }

  async function rollbackMessage(taskId: number, id: string) {
    setMessages((current) => current.filter((item) => item.id !== id));
    try {
      await desktopClient.deleteAgentMessage(taskId, id);
      return undefined;
    } catch (reason) {
      return String(reason);
    }
  }

  return {
    activeTaskId,
    archiveTask,
    approval,
    answerApproval,
    busy,
    composer,
    connection,
    deleteTask,
    diff,
    error,
    interrupt,
    messages,
    newDiscussion,
    openTask,
    runItems,
    running,
    requestTaskReview,
    renameTask,
    runtime,
    send,
    setComposer,
    stalled,
    submissionPhase,
    tasks,
    threadId,
    transcript,
    updateAgentPreferences
  };
}

function toChatMessage(saved: AgentMessage): ChatMessage {
  return {
    createdAt: saved.createdAt,
    id: saved.id,
    role: saved.role,
    text: saved.content
  };
}

function connectionFrom(config: AgentConfig): AgentConnection {
  const provider = config.defaultProvider;
  const model = config.providers[provider]?.model?.trim() || defaultModel(provider);
  const effort = config.providers[provider]?.reasoningEffort;
  return { effort: effort === "medium" || effort === "high" ? effort : "low", id: provider, model, provider: providerName(provider) };
}

function defaultModel(provider: AgentConfig["defaultProvider"]) {
  return provider === "codex" ? "gpt-5.6-terra" : "Provider default";
}

function providerName(provider: AgentConfig["defaultProvider"]) {
  return {
    claude: "Claude",
    codex: "Codex",
    gemini: "Gemini",
    ollama: "Ollama",
    opencode: "OpenCode",
    openrouter: "OpenRouter"
  }[provider];
}

function titleFrom(prompt: string) {
  const line = prompt.split("\n")[0] ?? prompt;
  return line.length > 36 ? `${line.slice(0, 36)}...` : line;
}
