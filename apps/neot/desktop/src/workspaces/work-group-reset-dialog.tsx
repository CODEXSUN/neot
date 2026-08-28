import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

export function WorkGroupResetDialog({
  busy = false,
  onClose,
  onConfirm,
  open
}: {
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onClose, open]);

  if (!open) return null;

  return (
    <div className="work-group-dialog-layer">
      <button aria-label="Close reset dialog" className="work-group-dialog-backdrop" disabled={busy} onClick={onClose} type="button" />
      <section aria-describedby="work-group-reset-description" aria-labelledby="work-group-reset-title" aria-modal="true" className="work-group-dialog" role="alertdialog">
        <header>
          <span className="work-group-dialog-icon"><AlertTriangle size={18} /></span>
          <div><h2 id="work-group-reset-title">Reset work group?</h2><p id="work-group-reset-description">This clears the local default folder and automatic workspace restore. Connected repository mappings stay saved.</p></div>
          <button aria-label="Close reset dialog" className="work-group-dialog-close" disabled={busy} onClick={onClose} type="button"><X size={17} /></button>
        </header>
        <footer>
          <button className="shadcn-button-outline" disabled={busy} onClick={onClose} type="button">Cancel</button>
          <button className="shadcn-button-destructive" disabled={busy} onClick={onConfirm} type="button">{busy ? "Resetting…" : "Reset work group"}</button>
        </footer>
      </section>
    </div>
  );
}
