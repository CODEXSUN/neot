import { Button } from "@neot/ui/components/button";
import { WorkspaceSelect } from "@neot/ui/workspace/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BotIcon,
  CheckCircle2Icon,
  PanelLeftOpenIcon,
  PanelRightOpenIcon,
  RotateCcwIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import { HoneyFace } from "../honey";
import { AgentIdeChat } from "./agent-ide.chat";
import { AgentIdeChatHistory, AgentIdeProjectAccordion } from "./agent-ide.project-context";
import { AgentIdeRunConsole } from "./agent-ide.run-console";
import {
  getAgentIdeCodexConnections,
  getAgentIdeChat,
  listAgentIdeChats,
  resolveAgentIdeApproval,
  setAgentIdeMessageFeedback,
  streamAgentIdeChat
} from "./agent-ide.services";
import type {
  AgentIdeAccess,
  AgentIdeApproval,
  AgentIdeAttachment,
  AgentIdeChatMessage,
  AgentIdeConnectionId,
  AgentIdeModel
} from "./agent-ide.types";

export function AgentIdeWorkspace() {
  const queryClient = useQueryClient();
  const projectsQuery = useProjectManagerRecordsQuery("project");
  const initiativesQuery = useProjectManagerRecordsQuery("issue");
  const tasksQuery = useProjectManagerRecordsQuery("task");
  const activitiesQuery = useProjectManagerRecordsQuery("activity");
  const reviewsQuery = useProjectManagerRecordsQuery("review");
  const codexConnections = useQuery({
    queryKey: ["neot", "agent-ide", "codex-connections"],
    queryFn: getAgentIdeCodexConnections,
    refetchInterval: 30_000
  });
  const [projectId, setProjectId] = useState(
    () => new URLSearchParams(window.location.search).get("project") ?? storedProjectId()
  );
  useEffect(() => {
    if (projectId) window.localStorage.setItem("neot_agent_project", projectId);
    else window.localStorage.removeItem("neot_agent_project");
  }, [projectId]);
  const honeyBrief = useMemo(() => {
    const search = new URLSearchParams(window.location.search);
    if (search.get("source") !== "honey") return undefined;
    const objective = search.get("objective")?.trim();
    return objective
      ? `Honey handoff brief:\n\nObjective: ${objective}\n\nUse the selected project context. Inspect the workspace before changing files.`
      : undefined;
  }, []);
  const initialWorkItem = useMemo(() => workItemFromSearch(window.location.search), []);
  const [workItem, setWorkItem] = useState(initialWorkItem);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentIdeChatMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [activity, setActivity] = useState("");
  const [access, setAccess] = useState<AgentIdeAccess>("read-only");
  const [connectionId, setConnectionId] = useState<AgentIdeConnectionId>("primary");
  const [model, setModel] = useState<AgentIdeModel>("gpt-5.6-terra");
  const [approval, setApproval] = useState<AgentIdeApproval | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [projectContextVisible, setProjectContextVisible] = useState(true);
  const [runConsoleVisible, setRunConsoleVisible] = useState(true);
  const initialMessage = honeyBrief ?? workItemBrief(initialWorkItem);
  const historyQuery = useQuery({
    queryKey: ["neot", "agent-ide", "chat-history"],
    queryFn: listAgentIdeChats
  });
  const projects = projectsQuery.data ?? [];
  const project = projects.find((candidate) => candidate.id === projectId);
  const workItemRecord = [
    ...(initiativesQuery.data ?? []),
    ...(tasksQuery.data ?? []),
    ...(activitiesQuery.data ?? []),
    ...(reviewsQuery.data ?? [])
  ].find((record) => record.id === workItem?.id && record.kind === workItem?.kind);
  const resolvedWorkItem = workItemRecord ? agentWorkItemFromRecord(workItemRecord) : workItem;
  const options = useMemo(
    () => projects.map((item) => ({ label: `${item.key} · ${item.title}`, value: item.id })),
    [projects]
  );

  const selectProject = (value: string) => {
    setProjectId(value);
    setThreadId(null);
    setConversationId(null);
    setMessages([]);
    setActiveRunId(null);
    setWorkItem(null);
  };

  const newChat = () => {
    setThreadId(null);
    setConversationId(null);
    setMessages([]);
    setActivity("");
    setApproval(null);
    setActiveRunId(null);
  };

  const changeAccess = (nextAccess: AgentIdeAccess) => {
    setAccess(nextAccess);
    newChat();
  };

  const changeModel = (nextModel: AgentIdeModel) => {
    setModel(nextModel);
    newChat();
  };

  const changeConnection = (value: string) => {
    setConnectionId(value as AgentIdeConnectionId);
    newChat();
  };

  const send = async (text: string, attachments: AgentIdeAttachment[]) => {
    if (!project) return;
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      {
        actions: [],
        attachments: attachments.map(({ name, size }) => ({ name, size })),
        createdAt: Date.now(),
        durationMs: null,
        feedback: null,
        files: [],
        id: crypto.randomUUID(),
        role: "user",
        text
      },
      {
        actions: [],
        attachments: [],
        createdAt: Date.now(),
        durationMs: null,
        feedback: null,
        files: [],
        id: assistantId,
        role: "assistant",
        text: ""
      }
    ]);
    setRunning(true);
    setActivity("Starting Codex turn");
    try {
      await streamAgentIdeChat(
        {
          access,
          attachments,
          connectionId,
          conversationId,
          message: text,
          model,
          threadId,
          workItem: resolvedWorkItem,
          project: {
            id: project.id,
            key: project.key,
            title: project.title,
            description: project.description,
            moduleKey: project.moduleKey,
            referenceId: project.referenceId,
            referenceType: project.referenceType
          }
        },
        (event) => {
          if (event.type === "chat.started") {
            setConversationId(event.conversationId);
            setThreadId(event.threadId);
            setActiveRunId(event.runId);
            void queryClient.invalidateQueries({ queryKey: ["neot", "agent-runs", project.id] });
          }
          if (event.type === "chat.delta") {
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantId ? { ...entry, text: entry.text + event.delta } : entry
              )
            );
          }
          if (event.type === "chat.action") {
            setActivity(event.action.label);
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantId
                  ? {
                      ...entry,
                      actions: [
                        ...entry.actions.filter((action) => action.id !== event.action.id),
                        event.action
                      ]
                    }
                  : entry
              )
            );
          }
          if (event.type === "chat.files") {
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantId ? { ...entry, files: event.files } : entry
              )
            );
          }
          if (event.type === "chat.approval") {
            setApproval({
              reason: event.reason,
              requestId: event.requestId,
              threadId: event.threadId
            });
            setActivity("Waiting for approval");
          }
          if (event.type === "chat.completed") {
            setMessages((current) =>
              current.map((entry) =>
                entry.id === assistantId
                  ? { ...entry, durationMs: Date.now() - entry.createdAt, id: event.messageId }
                  : entry
              )
            );
          }
          if (event.type === "chat.failed") throw new Error(event.message);
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Codex chat failed.";
      toast.error(message);
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantId
            ? { ...entry, durationMs: Date.now() - entry.createdAt, text: message }
            : entry
        )
      );
    } finally {
      setRunning(false);
      setActivity("");
      void queryClient.invalidateQueries({ queryKey: ["neot", "agent-ide", "chat-history"] });
    }
  };

  const decideApproval = async (decision: "accept" | "acceptForSession" | "decline") => {
    if (!approval) return;
    try {
      await resolveAgentIdeApproval({ ...approval, decision });
      setApproval(null);
      setActivity("Continuing Codex turn");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval could not be resolved.");
    }
  };

  const rateMessage = (messageId: string, feedback: "down" | "up") => {
    const current = messages.find((entry) => entry.id === messageId)?.feedback;
    const next = current === feedback ? null : feedback;
    setMessages((current) =>
      current.map((entry) => (entry.id === messageId ? { ...entry, feedback: next } : entry))
    );
    void setAgentIdeMessageFeedback(messageId, next).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Feedback could not be saved.");
    });
  };

  const openHistory = async (uuid: string) => {
    if (running) return;
    try {
      const history = await getAgentIdeChat(uuid);
      const historyProject = projects.find(
        (candidate) => candidate.id === history.projectUuid || candidate.key === history.projectKey
      );
      if (historyProject) setProjectId(historyProject.id);
      setConversationId(history.uuid);
      setThreadId(history.codexThreadId);
      setAccess(history.access);
      setConnectionId(history.connectionId);
      setModel(history.model);
      setWorkItem(
        history.workItem
          ? {
              ...history.workItem,
              assignee: "",
              description: "",
              dueDate: "",
              parentId: "",
              parentType: "",
              priority: "",
              status: "",
              kind: normalizeWorkItemKind(history.workItem.kind)
            }
          : null
      );
      setMessages(
        history.messages.map((entry) => ({
          actions: entry.actions,
          attachments: entry.attachments,
          createdAt: new Date(entry.createdAt).getTime(),
          durationMs: entry.durationMs,
          feedback: entry.feedback,
          files: entry.files,
          id: entry.uuid,
          role: entry.role,
          text: entry.body
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chat history could not be opened.");
    }
  };

  const selectedConnection = codexConnections.data?.find((item) => item.id === connectionId);
  const connected = selectedConnection?.connected ?? false;
  const connectionOptions = (codexConnections.data ?? []).map((item) => ({
    label: `${item.label}${item.connected ? " · Connected" : " · Offline"}`,
    value: item.id
  }));
  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-[38rem] flex-col overflow-hidden bg-background">
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex w-[17rem] shrink-0 items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <BotIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{project?.title ?? "Project Agent"}</h1>
            <AgentIdeProjectAccordion
              access={access}
              model={model}
              threadId={threadId}
              {...(project ? { project } : {})}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 sm:max-w-2xl">
          <div className="min-w-56 flex-1">
            <WorkspaceSelect
              ariaLabel="Project"
              onValueChange={selectProject}
              options={options}
              placeholder="Select project"
              value={projectId}
            />
          </div>
          <div className="w-56 shrink-0">
            <WorkspaceSelect
              ariaLabel="Codex connector"
              onValueChange={changeConnection}
              options={connectionOptions}
              placeholder="Codex connector"
              value={connectionId}
            />
          </div>
          <span
            className={`flex shrink-0 items-center gap-2 text-sm ${
              connected ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
            }`}
          >
            <CheckCircle2Icon className="size-4" />{" "}
            {connected ? selectedConnection?.label : "Disconnected"}
          </span>
          <Button asChild className="gap-2" size="sm" variant="ghost">
            <a href="/app/neot/honey" title="Open Honey Chat">
              <HoneyFace size="compact" /> Honey
            </a>
          </Button>
          <Button
            disabled={!messages.length || running}
            onClick={newChat}
            size="sm"
            variant="outline"
          >
            <RotateCcwIcon /> New chat
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {projectContextVisible ? (
          <AgentIdeChatHistory
            conversationId={conversationId}
            histories={historyQuery.data ?? []}
            onClose={() => setProjectContextVisible(false)}
            onOpenHistory={(uuid) => void openHistory(uuid)}
          />
        ) : (
          <button
            aria-label="Show chat history"
            className="hidden w-10 shrink-0 items-start justify-center border-r bg-background pt-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
            onClick={() => setProjectContextVisible(true)}
            title="Show chat history"
            type="button"
          >
            <PanelLeftOpenIcon className="size-4" />
          </button>
        )}
        <AgentIdeChat
          access={access}
          approval={approval}
          activity={activity}
          disabled={!project || !connected}
          messages={messages}
          {...(initialMessage ? { initialMessage } : {})}
          model={model}
          onAccessChange={changeAccess}
          onApprovalDecision={(decision) => void decideApproval(decision)}
          onEditMessage={() => newChat()}
          onFeedback={rateMessage}
          onModelChange={changeModel}
          onReviewChanges={() => setRunConsoleVisible(true)}
          onSend={(message, attachments) => void send(message, attachments)}
          {...(project ? { projectTitle: project.title } : {})}
          running={running}
        />
        {runConsoleVisible ? (
          <AgentIdeRunConsole
            activeRunId={activeRunId}
            onClose={() => setRunConsoleVisible(false)}
            projectUuid={project?.id ?? ""}
          />
        ) : (
          <button
            aria-label="Show run control"
            className="hidden w-10 shrink-0 items-start justify-center border-l bg-background pt-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground 2xl:flex"
            onClick={() => setRunConsoleVisible(true)}
            title="Show run control"
            type="button"
          >
            <PanelRightOpenIcon className="size-4" />
          </button>
        )}
      </div>
    </main>
  );
}

function storedProjectId() {
  return window.localStorage.getItem("neot_agent_project") ?? "";
}

type AgentWorkItem = {
  assignee: string;
  description: string;
  dueDate: string;
  id: string;
  key: string;
  kind: "activity" | "issue" | "project" | "review" | "task";
  parentId: string;
  parentType: string;
  priority: string;
  status: string;
  title: string;
};

function workItemFromSearch(searchValue: string): AgentWorkItem | null {
  const search = new URLSearchParams(searchValue);
  const kind = search.get("workItemKind");
  if (!kind || !["activity", "issue", "project", "review", "task"].includes(kind)) return null;
  const id = search.get("workItemId")?.trim() ?? "";
  const key = search.get("workItemKey")?.trim() ?? "";
  const title = search.get("workItemTitle")?.trim() ?? "";
  if (!id || !key || !title) return null;
  return {
    assignee: search.get("workItemAssignee")?.trim() ?? "",
    description: search.get("workItemDescription")?.trim() ?? "",
    dueDate: search.get("workItemDueDate")?.trim() ?? "",
    id,
    key,
    kind: kind as AgentWorkItem["kind"],
    parentId: search.get("workItemParentId")?.trim() ?? "",
    parentType: search.get("workItemParentType")?.trim() ?? "",
    priority: search.get("workItemPriority")?.trim() ?? "",
    status: search.get("workItemStatus")?.trim() ?? "",
    title
  };
}

function workItemBrief(workItem: AgentWorkItem | null) {
  if (!workItem) return undefined;
  return `Continue ${workItem.key}: ${workItem.title}. Review its project context and linked delivery records, then propose the next safe action. Preserve the chat reference for later continuation.`;
}

function normalizeWorkItemKind(kind: string): AgentWorkItem["kind"] {
  return ["activity", "issue", "project", "review", "task"].includes(kind)
    ? (kind as AgentWorkItem["kind"])
    : "task";
}

function agentWorkItemFromRecord(record: ProjectManagerRecord): AgentWorkItem {
  return {
    assignee: record.assignee,
    description: plainText(record.description),
    dueDate: record.dueDate,
    id: record.id,
    key: record.key,
    kind: normalizeWorkItemKind(record.kind),
    parentId: record.referenceId,
    parentType: record.referenceType,
    priority: record.priority,
    status: record.status,
    title: record.title
  };
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/gu, "").trim();
}
