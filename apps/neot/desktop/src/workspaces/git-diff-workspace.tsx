import { DiffEditor } from "@monaco-editor/react";
import { Columns2, GitCompare, LoaderCircle, Rows3 } from "lucide-react";
import { useEffect, useState } from "react";
import { loadMonacoLanguages } from "../editor/monaco-config";
import type { GitChange, GitFileDiff } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function GitDiffWorkspace({
  change,
  theme
}: {
  change: GitChange;
  theme: "dark" | "light";
}) {
  const [diff, setDiff] = useState<GitFileDiff>();
  const [error, setError] = useState<string>();
  const [monacoReady, setMonacoReady] = useState(false);
  const [split, setSplit] = useState(true);

  useEffect(() => {
    let current = true;
    void loadMonacoLanguages().then(() => current && setMonacoReady(true));
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    setDiff(undefined);
    setError(undefined);
    void desktopClient
      .gitFileDiff(change.path, change.originalPath)
      .then((result) => current && setDiff(result))
      .catch((reason) => current && setError(String(reason)));
    return () => {
      current = false;
    };
  }, [change.originalPath, change.path]);

  return (
    <section className="git-diff-workspace">
      <header className="git-diff-header">
        <span className="git-diff-title">
          <GitCompare size={15} />
          <strong>{change.path}</strong>
          <i className={statusClass(change.status)}>{change.status}</i>
        </span>
        <div className="git-diff-modes" aria-label="Diff layout">
          <button className={split ? "active" : ""} onClick={() => setSplit(true)} type="button">
            <Columns2 size={14} /> Split
          </button>
          <button className={!split ? "active" : ""} onClick={() => setSplit(false)} type="button">
            <Rows3 size={14} /> Inline
          </button>
        </div>
      </header>
      <div className="git-diff-labels">
        <span>{change.originalPath ? `HEAD · ${change.originalPath}` : "HEAD"}</span>
        <span>Working tree · {change.path}</span>
      </div>
      {error ? (
        <div className="inline-error">{error}</div>
      ) : !diff || !monacoReady ? (
        <div className="workspace-loading"><LoaderCircle size={18} /> Loading changes...</div>
      ) : diff.binary ? (
        <div className="editor-welcome">
          <GitCompare size={28} />
          <h1>Binary file changed</h1>
          <p>Text comparison is not available for this file.</p>
        </div>
      ) : (
        <DiffEditor
          height="100%"
          language={languageFor(change.path)}
          modified={diff.modified}
          modifiedModelPath={`file:///working/${modelPath(change.path)}`}
          options={{
            automaticLayout: true,
            diffAlgorithm: "advanced",
            enableSplitViewResizing: true,
            fontSize: 13,
            ignoreTrimWhitespace: false,
            minimap: { enabled: false },
            originalEditable: false,
            readOnly: true,
            renderOverviewRuler: true,
            renderSideBySide: split,
            scrollBeyondLastLine: false,
            smoothScrolling: true
          }}
          original={diff.original}
          originalModelPath={`file:///head/${modelPath(change.originalPath ?? change.path)}`}
          theme={theme === "dark" ? "vs-dark" : "vs"}
        />
      )}
    </section>
  );
}

function statusClass(status: string) {
  if (status.includes("A") || status === "??") return "added";
  if (status.includes("D")) return "deleted";
  return "modified";
}

function languageFor(path: string) {
  const extension = path.split(".").at(-1)?.toLowerCase();
  return (
    ({ css: "css", html: "html", json: "json", md: "markdown", py: "python", rs: "rust", ts: "typescript", tsx: "typescript" } as Record<string, string>)[extension ?? ""] ?? "plaintext"
  );
}

function modelPath(path: string) {
  return path.replaceAll("\\", "/");
}
