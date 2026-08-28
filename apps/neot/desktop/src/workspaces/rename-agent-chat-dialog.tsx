import { Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentTask } from "../contracts/desktop";

export function RenameAgentChatDialog({
  busy = false,
  onClose,
  onConfirm,
  open,
  task
}: {
  busy?: boolean;
  onClose: () => void;
  onConfirm: (title: string) => Promise<void>;
  open: boolean;
  task: AgentTask | undefined;
}) {
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (open) setTitle(task?.title ?? "");
  }, [open, task?.id, task?.title]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose, open]);

  if (!open || !task) return null;

  const normalizedTitle = title.trim();

  async function submitRename() {
    try {
      await onConfirm(normalizedTitle);
    } catch {
      // The session reports the error and leaves this dialog open for a retry.
    }
  }

  return (
    <div className="agent-rename-dialog-layer">
      <button
        aria-label="Close rename chat dialog"
        className="agent-rename-dialog-backdrop"
        disabled={busy}
        onClick={onClose}
        type="button"
      />
      <section
        aria-describedby="rename-agent-chat-description"
        aria-labelledby="rename-agent-chat-title"
        aria-modal="true"
        className="agent-rename-dialog"
        role="dialog"
      >
        <header>
          <span className="agent-rename-dialog-icon"><Pencil size={17} /></span>
          <div>
            <h2 id="rename-agent-chat-title">Rename discussion</h2>
            <p id="rename-agent-chat-description">Choose a clear title for this saved repository discussion.</p>
          </div>
          <button
            aria-label="Close rename chat dialog"
            className="agent-rename-dialog-close"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </header>
        <form onSubmit={(event) => { event.preventDefault(); void submitRename(); }}>
          <label htmlFor="rename-agent-chat-title-input">Title</label>
          <input
            autoFocus
            disabled={busy}
            id="rename-agent-chat-title-input"
            maxLength={180}
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
          <small>{normalizedTitle.length}/180</small>
          <footer>
            <button className="shadcn-button-outline" disabled={busy} onClick={onClose} type="button">Cancel</button>
            <button className="agent-dialog-primary" disabled={busy || !normalizedTitle} type="submit">
              {busy ? "Saving…" : "Save title"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
