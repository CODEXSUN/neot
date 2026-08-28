import { MessageSquare, X } from "lucide-react";
import type { AgentTask } from "../contracts/desktop";

export function AgentChatTabs({
  activeTaskId,
  disabled,
  onClose,
  onOpen,
  tasks
}: {
  activeTaskId: number | undefined;
  disabled: boolean;
  onClose: (taskId: number) => void;
  onOpen: (task: AgentTask) => void;
  tasks: AgentTask[];
}) {
  if (tasks.length < 2) return null;

  return (
    <nav aria-label="Open project chats" className="agent-open-chat-tabs" role="tablist">
      {tasks.map((task) => {
        const active = task.id === activeTaskId;
        return (
          <div className={`agent-open-chat-tab${active ? " active" : ""}`} key={task.id}>
            <button
              aria-selected={active}
              disabled={disabled}
              onClick={() => onOpen(task)}
              role="tab"
              title={task.worktreeBranch ? `${task.title} · ${task.worktreeBranch}` : task.title}
              type="button"
            >
              <i aria-label={task.runStatus} className={`agent-run-status ${task.runStatus}`} />
              <MessageSquare size={13} />
              <span>{task.title}</span>
            </button>
            <button
              aria-label={`Close ${task.title}`}
              className="agent-open-chat-tab-close"
              disabled={disabled}
              onClick={() => onClose(task.id)}
              type="button"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </nav>
  );
}
