import { CheckCircle2, Download, RefreshCw, ShieldCheck, X } from "lucide-react";
import type { DesktopUpdateState } from "./use-desktop-updater";

export function UpdateButton({
  onOpen,
  update
}: {
  onOpen: () => void;
  update: DesktopUpdateState;
}) {
  const active = update.phase === "downloading" || update.phase === "ready";
  return (
    <button
      aria-label="Updates"
      className={active ? "update-trigger active" : "update-trigger"}
      onClick={onOpen}
      title={update.phase === "ready" ? `Version ${update.version} is ready` : "Updates"}
      type="button"
    >
      <Download size={16} />
      {update.phase === "ready" ? <span /> : null}
    </button>
  );
}

export function VersionUpdateButton({
  onOpen,
  update
}: {
  onOpen: () => void;
  update: DesktopUpdateState;
}) {
  const updateReady = update.phase === "ready";

  function openAndCheck() {
    onOpen();
    if (shouldCheckWhenOpened(update.phase)) void update.checkForUpdate();
  }

  return (
    <button
      aria-label={`NEOT version ${update.currentVersion}. Check for updates`}
      className={updateReady ? "version-update active" : "version-update"}
      onClick={openAndCheck}
      title={
        updateReady
          ? `Version ${update.version} is ready to install`
          : `Version ${update.currentVersion} · Check for updates`
      }
      type="button"
    >
      <span>v{update.currentVersion}</span>
      {updateReady ? <i aria-hidden="true" /> : null}
    </button>
  );
}

export function shouldCheckWhenOpened(phase: DesktopUpdateState["phase"]) {
  return !["checking", "downloading", "installing", "ready"].includes(phase);
}

export function UpdateCenter({
  onClose,
  update
}: {
  onClose: () => void;
  update: DesktopUpdateState;
}) {
  return (
    <div className="update-backdrop" role="presentation">
      <section
        aria-label="Update"
        aria-modal="true"
        className="update-center"
        role="dialog"
      >
        <header>
          <div>
            <strong>NEOT updates</strong>
            <small>Signed releases from CODEXSUN/neot</small>
          </div>
          <button aria-label="Close updates" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </header>

        <UpdateSummary update={update} />

        {update.error ? <div className="update-error">{update.error}</div> : null}
        {update.notes ? <p className="update-notes">{update.notes}</p> : null}
        <footer>
          <button
            disabled={update.phase === "checking" || update.phase === "downloading"}
            onClick={() => void update.checkForUpdate()}
            type="button"
          >
            <RefreshCw size={14} /> Check again
          </button>
          <button
            className="primary"
            disabled={update.phase !== "ready"}
            onClick={() => void update.installAndRestart()}
            type="button"
          >
            <ShieldCheck size={14} />
            {update.phase === "installing" ? "Installing..." : "Install and restart"}
          </button>
        </footer>
        <small className="update-policy">
          Installation starts only after approval. Windows may request administrator permission.
        </small>
      </section>
    </div>
  );
}

function UpdateSummary({ update }: { update: DesktopUpdateState }) {
  if (update.phase === "checking") return <p>Checking for a signed update...</p>;
  if (update.phase === "downloading") {
    return (
      <div className="update-download">
        <span>Downloading version {update.version}</span>
        <progress max="100" value={update.progress ?? 0} />
        <small>{update.progress ?? 0}%</small>
      </div>
    );
  }
  if (update.phase === "ready") {
    return (
      <div className="update-ready">
        <CheckCircle2 size={19} />
        <span>
          <strong>Version {update.version} is ready</strong>
          <small>Current version: {update.currentVersion}</small>
        </span>
      </div>
    );
  }
  if (update.phase === "current") return <p>Version {update.currentVersion} is current.</p>;
  if (update.phase === "unavailable") return <p>Updates are available in the installed app.</p>;
  return <p>Check for the latest signed release.</p>;
}
