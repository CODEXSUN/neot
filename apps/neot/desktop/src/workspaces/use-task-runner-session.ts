import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type { AgentTask, LocalTask } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { buildAgentPrompt } from "./agent-context";
import { agentErrorFrom, extractTextAt, parseAgentProtocolMessage, textAt, threadIdFrom } from "./agent-protocol";
import type { Approval, RunItem } from "./agent-workspace-parts";

export function useTaskRunnerSession(onRefreshChanges: () => Promise<void>) {
  const [approval, setApproval] = useState<Approval | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [finalReply, setFinalReply] = useState<string | undefined>(undefined);
  const [runItems, setRunItems] = useState<RunItem[]>([]);
  const [runnerTask, setRunnerTask] = useState<AgentTask | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const taskRef = useRef<AgentTask | undefined>(undefined);
  const threadRef = useRef<string | undefined>(undefined);
  const turnRef = useRef<string | undefined>(undefined);
  const resolverRef = useRef<((threadId: string) => void) | undefined>(undefined);
  const streamedReplyRef = useRef("");

  useEffect(() => { taskRef.current = runnerTask; }, [runnerTask]);
  useEffect(() => {
    let stop = () => undefined;
    void listen<unknown>("agent-event", (event) => {
      const message = parseAgentProtocolMessage(event.payload);
      if (!message) return;
      const threadId = threadIdFrom(message);
      if (threadId && !threadRef.current) { threadRef.current = threadId; resolverRef.current?.(threadId); resolverRef.current = undefined; }
      if (threadId && threadRef.current && threadId !== threadRef.current) return;
      if (message.method === "turn/started") { turnRef.current = textAt(message, "params", "turn", "id"); setRunning(true); }
      if (message.method === "item/agentMessage/delta") {
        const delta = extractTextAt(message, "params", "delta") || extractTextAt(message, "params", "text") || extractTextAt(message, "params", "content");
        if (delta) { streamedReplyRef.current += delta; setFinalReply(streamedReplyRef.current); }
      }
      if (["item/created", "item/started", "item/updated", "item/completed"].includes(message.method ?? "")) {
        const item = message.params?.item as Record<string, unknown> | undefined;
        const type = typeof item?.type === "string" ? item.type : "activity";
        if (["commandExecution", "fileChange", "mcpToolCall", "webSearch"].includes(type)) setRunItems((items) => [...items.filter((entry) => entry.id !== item?.id), { id: typeof item?.id === "string" ? item.id : crypto.randomUUID(), label: typeof item?.command === "string" ? item.command : "Agent activity", status: message.method === "item/completed" ? "completed" : "running", type }]);
        if (message.method === "item/completed" && ["agentMessage", "agent_message"].includes(type)) {
          const output = extractTextAt(message, "params", "item", "text") || extractTextAt(message, "params", "item", "content");
          if (output) {
            streamedReplyRef.current = output;
            setFinalReply(output);
            if (taskRef.current) void desktopClient.saveAgentMessage(taskRef.current.id, typeof item?.id === "string" ? item.id : crypto.randomUUID(), "agent", output);
          }
        }
      }
      if (["item/commandExecution/requestApproval", "item/fileChange/requestApproval"].includes(message.method ?? "") && message.id !== undefined) setApproval({ id: message.id, command: textAt(message, "params", "command") ?? "Workspace action", reason: textAt(message, "params", "reason") ?? "Approval is required to continue." });
      if (message.method === "turn/completed") {
        const failure = agentErrorFrom(event.payload);
        const status = textAt(message, "params", "turn", "status");
        if (failure || (status && status !== "completed")) {
          setError(failure ?? `The task ended with status: ${status}.`);
          setRunning(false); turnRef.current = undefined;
          if (taskRef.current) void desktopClient.setAgentTaskStatus(taskRef.current.id, "failed").then(setRunnerTask);
          return;
        }
        const output = streamedReplyRef.current;
        if (!output) {
          setError("The agent completed without a final response.");
          setRunning(false); turnRef.current = undefined;
          if (taskRef.current) void desktopClient.setAgentTaskStatus(taskRef.current.id, "failed").then(setRunnerTask);
          return;
        }
        setFinalReply(output);
        setRunning(false); turnRef.current = undefined;
        if (taskRef.current) void desktopClient.setAgentTaskStatus(taskRef.current.id, "completed").then(setRunnerTask);
        void onRefreshChanges();
      }
      const failure = agentErrorFrom(event.payload);
      if (failure) { setError(failure); setRunning(false); if (taskRef.current) void desktopClient.setAgentTaskStatus(taskRef.current.id, "failed").then(setRunnerTask); }
    }).then((unlisten) => { stop = () => { unlisten(); }; });
    return () => stop();
  }, [onRefreshChanges]);

  async function select(task: LocalTask) {
    setApproval(undefined); setError(undefined); setRunItems([]); setFinalReply(undefined); setRunning(false); streamedReplyRef.current = ""; turnRef.current = undefined; threadRef.current = undefined;
    const saved = await desktopClient.getRunnerTask(task.id);
    setRunnerTask(saved ?? undefined);
    if (saved) {
      threadRef.current = saved.threadId;
      const messages = await desktopClient.listAgentMessages(saved.id);
      setFinalReply([...messages].reverse().find((message) => message.role === "agent")?.content);
    }
  }

  async function run(task: LocalTask) {
    resolverRef.current = undefined;
    threadRef.current = undefined;
    turnRef.current = undefined;
    setError(undefined); setFinalReply(undefined); setRunItems([]); streamedReplyRef.current = ""; setRunning(true);
    try {
      await desktopClient.startAgentRuntime();
      const threadId = await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          resolverRef.current = undefined;
          reject(new Error("The local agent process did not assign a runner thread ID in time."));
        }, 30_000);
        resolverRef.current = (nextThreadId) => {
          window.clearTimeout(timeout);
          resolve(nextThreadId);
        };
        void desktopClient.startAgentThread().catch(reject);
      });
      const saved = await desktopClient.saveAgentTask(threadId, task.title, "workspaceWrite", "runner", task.id);
      taskRef.current = saved; threadRef.current = threadId; setRunnerTask(saved);
      await desktopClient.setAgentTaskStatus(saved.id, "running");
      const [learningContext, skills] = await Promise.all([
        desktopClient.projectLearningContext(),
        desktopClient.listProjectSkills()
      ]);
      const skillContext = skills.length
        ? `<project_skills>Read only the relevant project skill instructions before acting:\n${skills.map((skill) => `- ${skill.path}`).join("\n")}\n</project_skills>`
        : "";
      const prompt = buildAgentPrompt(
        `Complete this local task in the isolated task-runner worktree. Return a clear final response with the actual result.\n\nTask title: ${task.title}\n\nExecution instructions:\n${task.execution}`,
        [learningContext, skillContext].filter(Boolean).join("\n\n"),
        []
      );
      await desktopClient.sendAgentTurn(saved.id, threadId, prompt, "workspaceWrite");
    } catch (reason) { setRunning(false); setError(String(reason)); }
  }

  async function respond(choice: string) {
    const task = taskRef.current;
    const threadId = threadRef.current;
    if (!task || !threadId || running) return;

    const prompt = `The user selected this task-runner action: ${choice}\n\nContinue the task from that answer. If another decision is needed, ask one question and provide its available actions as a short bullet list.`;

    setApproval(undefined);
    setError(undefined);
    setFinalReply(undefined);
    setRunItems([]);
    streamedReplyRef.current = "";
    setRunning(true);
    try {
      const saved = await desktopClient.setAgentTaskStatus(task.id, "running");
      setRunnerTask(saved);
      await desktopClient.saveAgentMessage(task.id, crypto.randomUUID(), "user", choice);
      await desktopClient.sendAgentTurn(task.id, threadId, prompt, "workspaceWrite");
    } catch (reason) {
      setRunning(false);
      setError(`The choice was not sent. ${String(reason)}`);
      if (taskRef.current) void desktopClient.setAgentTaskStatus(taskRef.current.id, "failed").then(setRunnerTask);
    }
  }

  async function stop() { if (threadRef.current && turnRef.current) await desktopClient.interruptAgentTurn(threadRef.current, turnRef.current); }
  async function answer(decision: "accept" | "acceptForSession" | "decline") { if (!approval) return; const current = approval; setApproval(undefined); await desktopClient.answerAgentApproval(current.id, decision); }
  return { approval, answer, error, finalReply, respond, run, runnerTask, runItems, running, select, stop };
}
