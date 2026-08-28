import { Check, GitCommit, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { GitChange, GitWorktree } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { reviewIsCurrent } from "./change-review";

export function GitPanel({
  changes,
  onRefresh,
  onSelectChange,
  selectedPath,
  workspacePath
}: {
  changes: GitChange[];
  onRefresh: () => Promise<void>;
  onSelectChange: (change: GitChange) => void;
  selectedPath: string | undefined;
  workspacePath: string;
}) {
  const [message, setMessage] = useState("");
  const [worktrees, setWorktrees] = useState<GitWorktree[]>([]);
  const [worktreeName, setWorktreeName] = useState("");
  const [error, setError] = useState<string>();
  const [currentFingerprint, setCurrentFingerprint] = useState<string>();
  const [approvedFingerprint, setApprovedFingerprint] = useState<string>();
  const reviewCurrent = reviewIsCurrent(approvedFingerprint, currentFingerprint);

  useEffect(() => {
    let disposed = false;
    if (!changes.length) {
      setCurrentFingerprint(undefined);
      setApprovedFingerprint(undefined);
      return;
    }
    void desktopClient
      .gitChangeFingerprint()
      .then((fingerprint) => {
        if (!disposed) setCurrentFingerprint(fingerprint);
      })
      .catch((reason) => {
        if (!disposed) setError(String(reason));
      });
    return () => {
      disposed = true;
    };
  }, [changes]);

  async function action(run: () => Promise<unknown>) {
    try {
      await run();
      setError(undefined);
      await onRefresh();
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function reviewedAction(run: (fingerprint: string) => Promise<unknown>) {
    await action(async () => {
      const fingerprint = await desktopClient.gitChangeFingerprint();
      setCurrentFingerprint(fingerprint);
      if (!reviewIsCurrent(approvedFingerprint, fingerprint)) {
        throw new Error("The change set changed after review. Review and approve it again.");
      }
      await run(fingerprint);
    });
  }

  async function approveChanges() {
    try {
      const fingerprint = await desktopClient.gitChangeFingerprint();
      setCurrentFingerprint(fingerprint);
      setApprovedFingerprint(fingerprint);
      setError(undefined);
    } catch (reason) {
      setError(String(reason));
    }
  }
  return (
    <div className="git-panel">
      <div className={`change-review${reviewCurrent ? " approved" : ""}`}>
        <span>
          <strong>{reviewCurrent ? "Change set approved" : "Review required"}</strong>
          <small>
            {reviewCurrent
              ? "Staging and commit are unlocked for the reviewed content."
              : "Inspect the diffs, then approve this exact content before staging."}
          </small>
        </span>
        <button
          disabled={!changes.length || !currentFingerprint || reviewCurrent}
          onClick={() => void approveChanges()}
          type="button"
        >
          <Check size={13} /> {reviewCurrent ? "Approved" : "Approve changes"}
        </button>
      </div>
      <div className="commit-box">
        <textarea
          aria-label="Commit message"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Commit message"
          value={message}
        />
        <button
          disabled={!message.trim() || !reviewCurrent}
          onClick={() =>
            void reviewedAction(async (fingerprint) => {
              await desktopClient.gitCommit(message, fingerprint);
              setMessage("");
            })
          }
          type="button"
        >
          <GitCommit size={14} /> Commit staged
        </button>
      </div>
      {error ? <div className="panel-error">{error}</div> : null}
      <div className="tree-section">Changes {changes.length}</div>
      {changes.map((change) => (
        <div className={`git-change${selectedPath === change.path ? " selected" : ""}`} key={change.path}>
          <button
            className="git-path"
            onClick={() => onSelectChange(change)}
            title="Inspect diff"
            type="button"
          >
            {change.path}
          </button>
          <span>{change.status}</span>
          <button
            aria-label={`Stage ${change.path}`}
            disabled={!reviewCurrent}
            onClick={() =>
              void reviewedAction((fingerprint) =>
                desktopClient.gitStage([change.path], fingerprint)
              )
            }
            type="button"
          >
            <Plus size={13} />
          </button>
          <button
            aria-label={`Unstage ${change.path}`}
            onClick={() => void action(() => desktopClient.gitUnstage([change.path]))}
            type="button"
          >
            <Minus size={13} />
          </button>
        </div>
      ))}
      <button
        className="worktree-toggle"
        onClick={() => void desktopClient.gitWorktrees().then(setWorktrees)}
        type="button"
      >
        <Check size={13} /> Show worktrees
      </button>
      <form
        className="worktree-create"
        onSubmit={(event) => {
          event.preventDefault();
          if (!worktreeName.trim()) return;
          void action(async () => {
            await desktopClient.gitCreateWorktree(worktreeName);
            setWorktreeName("");
            setWorktrees(await desktopClient.gitWorktrees());
          });
        }}
      >
        <input
          aria-label="New worktree name"
          onChange={(event) => setWorktreeName(event.target.value)}
          placeholder="feature-name"
          value={worktreeName}
        />
        <button disabled={!worktreeName.trim()} type="submit">
          <Plus size={13} /> Create
        </button>
      </form>
      {worktrees.map((worktree) => (
        <div className="worktree-row" key={worktree.path}>
          <span className="worktree-title">
            <strong>{worktree.branch || "detached"}</strong>
            {worktree.path.toLowerCase() !== workspacePath.toLowerCase() ? (
              <button
                aria-label={`Remove ${worktree.branch || "detached worktree"}`}
                onClick={() =>
                  void action(async () => {
                    await desktopClient.gitRemoveWorktree(worktree.path);
                    setWorktrees(await desktopClient.gitWorktrees());
                  })
                }
                type="button"
              >
                <Trash2 size={12} />
              </button>
            ) : null}
          </span>
          <span>
            {worktree.head} - {worktree.path}
          </span>
        </div>
      ))}
    </div>
  );
}
