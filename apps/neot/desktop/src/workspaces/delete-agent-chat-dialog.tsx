import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";
import type { AgentTask } from "../contracts/desktop";

export function DeleteAgentChatDialog({
  busy = false,
  onClose,
  onConfirm,
  open,
  task
}: {
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  open: boolean;
  task: AgentTask | undefined;
}) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose, open]);

  if (!open || !task) return null;

  async function confirmDeletion() {
    try {
      await onConfirm();
    } catch {
      // The session shows the delete failure and keeps this dialog available for retry.
    }
  }

  return (
    <div className="agent-delete-dialog-layer">
      <button
        aria-label="Close delete chat dialog"
        className="agent-delete-dialog-backdrop"
        disabled={busy}
        onClick={onClose}
        type="button"
      />
      <section
        aria-describedby="delete-agent-chat-description"
        aria-labelledby="delete-agent-chat-title"
        aria-modal="true"
        className="agent-delete-dialog"
        role="alertdialog"
      >
        <header>
          <span className="agent-delete-dialog-icon"><AlertTriangle size={18} /></span>
          <div>
            <h2 id="delete-agent-chat-title">Force delete chat?</h2>
            <p id="delete-agent-chat-description">
              <strong>{task.title}</strong> and its saved messages will be permanently removed from
              this device. This cannot be undone.
            </p>
          </div>
          <button
            aria-label="Close delete chat dialog"
            className="agent-delete-dialog-close"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X size={17} />
          </button>
        </header>
        <footer>
          <button className="shadcn-button-outline" disabled={busy} onClick={onClose} type="button">
            Cancel
          </button>
          <button className="shadcn-button-destructive" disabled={busy} onClick={() => void confirmDeletion()} type="button">
            {busy ? "Deleting…" : "Force delete"}
          </button>
        </footer>
      </section>
    </div>
  );
}
