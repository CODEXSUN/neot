import { Archive, ClipboardCheck, MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AgentTask } from "../contracts/desktop";
import { DeleteAgentChatDialog } from "./delete-agent-chat-dialog";
import { RenameAgentChatDialog } from "./rename-agent-chat-dialog";

export function AgentChatHistory({
  activeTaskId,
  busy,
  onArchive,
  onDelete,
  onNewDiscussion,
  onOpenTask,
  onRename,
  onRequestReview,
  tasks
}: {
  activeTaskId: number | undefined;
  busy: boolean;
  onArchive: (task: AgentTask) => void;
  onDelete: (task: AgentTask) => Promise<void | undefined>;
  onNewDiscussion: () => void;
  onOpenTask: (task: AgentTask) => void;
  onRename: (task: AgentTask, title: string) => Promise<void | undefined>;
  onRequestReview: (task: AgentTask) => void;
  tasks: AgentTask[];
}) {
  const [deletePending, setDeletePending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentTask>();
  const [openMenuTaskId, setOpenMenuTaskId] = useState<number>();
  const [renamePending, setRenamePending] = useState(false);
  const [renameTarget, setRenameTarget] = useState<AgentTask>();
  const [menuPosition, setMenuPosition] = useState<HistoryMenuPosition>();
  const historyRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      if (historyRef.current?.contains(event.target as Node) || menuRef.current?.contains(event.target as Node)) return;
      setOpenMenuTaskId(undefined);
    };
    const closeMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuTaskId(undefined);
    };
    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    window.addEventListener("keydown", closeMenuOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
      window.removeEventListener("keydown", closeMenuOnEscape);
    };
  }, []);

  useEffect(() => {
    const closeMenu = () => setOpenMenuTaskId(undefined);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  async function deleteSelectedTask() {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(undefined);
    } finally {
      setDeletePending(false);
    }
  }

  async function renameSelectedTask(title: string) {
    if (!renameTarget) return;
    setRenamePending(true);
    try {
      await onRename(renameTarget, title);
      setRenameTarget(undefined);
    } finally {
      setRenamePending(false);
    }
  }

  function toggleTaskMenu(task: AgentTask, trigger: HTMLButtonElement) {
    if (openMenuTaskId === task.id) {
      setOpenMenuTaskId(undefined);
      return;
    }
    setMenuPosition(historyMenuPosition(trigger.getBoundingClientRect()));
    setOpenMenuTaskId(task.id);
  }

  const menuTask = tasks.find((task) => task.id === openMenuTaskId);

  return (
    <section className="agent-chat-history" aria-label="Agent discussion history" ref={historyRef}>
      <button className="history-new-discussion" disabled={busy} onClick={onNewDiscussion} type="button">
        <Plus size={15} /> New discussion
      </button>
      {tasks.length === 0 ? (
        <p className="history-empty">No repository discussions yet.</p>
      ) : (
        <div className="history-list">
          {tasks.map((task) => (
            <div
              className={`history-row${task.id === activeTaskId ? " active" : ""}`}
              key={task.id}
            >
              <button
                className="history-open-task"
                disabled={busy}
                onClick={() => onOpenTask(task)}
                type="button"
              >
                <span><MessageSquare size={13} /> {task.title}</span>
                <small>{task.reviewRequested ? "Review queued" : formatHistoryTime(task.updatedAt)}</small>
              </button>
              <div className="history-task-menu">
                <button
                  aria-expanded={openMenuTaskId === task.id}
                  aria-haspopup="menu"
                  aria-label={`Chat actions for ${task.title}`}
                  className="history-task-menu-trigger"
                  disabled={busy}
                  onClick={(event) => toggleTaskMenu(task, event.currentTarget)}
                  type="button"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {menuTask && menuPosition ? createPortal(
        <div
          className="history-task-menu-popover"
          ref={menuRef}
          role="menu"
          style={menuPosition}
        >
          <button disabled={busy} onClick={() => { setOpenMenuTaskId(undefined); setRenameTarget(menuTask); }} role="menuitem" type="button">
            <Pencil size={14} /> Rename
          </button>
          <button disabled={busy || menuTask.reviewRequested} onClick={() => { setOpenMenuTaskId(undefined); onRequestReview(menuTask); }} role="menuitem" type="button">
            <ClipboardCheck size={14} /> {menuTask.reviewRequested ? "Review requested" : "Request review"}
          </button>
          <button disabled={busy} onClick={() => { setOpenMenuTaskId(undefined); onArchive(menuTask); }} role="menuitem" type="button">
            <Archive size={14} /> Archive
          </button>
          <button className="danger" disabled={busy} onClick={() => { setOpenMenuTaskId(undefined); setDeleteTarget(menuTask); }} role="menuitem" type="button">
            <Trash2 size={14} /> Force delete
          </button>
        </div>,
        document.body
      ) : null}
      <DeleteAgentChatDialog
        busy={busy || deletePending}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={deleteSelectedTask}
        open={Boolean(deleteTarget)}
        task={deleteTarget}
      />
      <RenameAgentChatDialog
        busy={busy || renamePending}
        onClose={() => setRenameTarget(undefined)}
        onConfirm={renameSelectedTask}
        open={Boolean(renameTarget)}
        task={renameTarget}
      />
    </section>
  );
}

type HistoryMenuPosition = {
  left: number;
  top: number;
  transform?: "translateY(-100%)";
};

export function historyMenuPosition(
  rect: Pick<DOMRect, "bottom" | "right" | "top">,
  viewport = { height: window.innerHeight, width: window.innerWidth }
): HistoryMenuPosition {
  const menuHeight = 140;
  const menuWidth = 150;
  const margin = 8;
  const opensBelow = rect.bottom + menuHeight + margin <= viewport.height;
  return {
    left: Math.max(margin, Math.min(rect.right - menuWidth, viewport.width - menuWidth - margin)),
    top: opensBelow ? rect.bottom + 4 : rect.top - 4,
    ...(opensBelow ? {} : { transform: "translateY(-100%)" as const })
  };
}

function formatHistoryTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Saved locally" : date.toLocaleString();
}
