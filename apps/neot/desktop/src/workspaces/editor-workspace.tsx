import Editor from "@monaco-editor/react";
import { LoaderCircle, Save, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadMonacoLanguages } from "../editor/monaco-config";
import type { DesktopWorkspace, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { WorkspaceSwitcher } from "../shell/workspace-switcher";

type Document = { content: string; saved: string; loading: boolean; error: string | undefined };

export function EditorWorkspace({
  currentWorkspace,
  onSelectWorkspace,
  path,
  onSelectPath,
  theme,
  workspaces
}: {
  currentWorkspace: Workspace;
  onSelectWorkspace: (path: string) => void;
  path: string | undefined;
  onSelectPath: (path: string | undefined) => void;
  theme: "dark" | "light";
  workspaces: DesktopWorkspace[];
}) {
  const [documents, setDocuments] = useState<Record<string, Document>>({});
  const [monacoReady, setMonacoReady] = useState(false);
  const loads = useRef(new Map<string, symbol>());
  const paths = useMemo(() => Object.keys(documents), [documents]);

  useEffect(() => {
    let current = true;
    void loadMonacoLanguages().then(() => current && setMonacoReady(true));
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!path || documents[path] || loads.current.has(path)) return;
    const load = Symbol(path);
    loads.current.set(path, load);
    setDocuments((current) => ({
      ...current,
      [path]: { content: "", saved: "", loading: true, error: undefined }
    }));
    void desktopClient
      .readFile(path)
      .then((content) => {
        if (loads.current.get(path) !== load) return;
        setDocuments((current) => ({
          ...current,
          [path]: { content, saved: content, loading: false, error: undefined }
        }));
      })
      .catch((reason) => {
        if (loads.current.get(path) !== load) return;
        setDocuments((current) => ({
          ...current,
          [path]: { content: "", saved: "", loading: false, error: String(reason) }
        }));
      })
      .finally(() => {
        if (loads.current.get(path) === load) loads.current.delete(path);
      });
  }, [documents, path]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && path) {
        event.preventDefault();
        void save(path);
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  async function save(target: string) {
    const document = documents[target];
    if (!document || document.content === document.saved) return;
    try {
      await desktopClient.writeFile(target, document.content);
      setDocuments((current) => {
        const active = current[target]!;
        return { ...current, [target]: { ...active, saved: active.content, error: undefined } };
      });
    } catch (reason) {
      setDocuments((current) => ({
        ...current,
        [target]: { ...current[target]!, error: String(reason) }
      }));
    }
  }

  function close(target: string) {
    const document = documents[target]!;
    if (
      document.content !== document.saved &&
      !window.confirm(`Discard unsaved changes in ${target}?`)
    )
      return;
    loads.current.delete(target);
    const next = { ...documents };
    delete next[target];
    setDocuments(next);
    if (target === path) {
      const index = paths.indexOf(target);
      onSelectPath(paths[index - 1] ?? paths[index + 1]);
    }
  }

  if (!path || !documents[path]) {
    return (
      <section className="editor-welcome">
        <div className="brand-glyph">CL</div>
        <h1>NEOT</h1>
        <p>Open a file from Explorer or Search to start editing.</p>
      </section>
    );
  }
  const document = documents[path];
  const dirty = document.content !== document.saved;
  return (
    <section className="editor">
      <div className="editor-tabs" role="tablist">
        {paths.map((tabPath) => {
          const tab = documents[tabPath]!;
          return (
            <button
              aria-selected={tabPath === path}
              className={tabPath === path ? "active" : ""}
              key={tabPath}
              onClick={() => onSelectPath(tabPath)}
              role="tab"
              type="button"
            >
              {tab.content !== tab.saved ? <i /> : null}
              <span>{fileName(tabPath)}</span>
              <X
                aria-label={`Close ${fileName(tabPath)}`}
                onClick={(event) => {
                  event.stopPropagation();
                  close(tabPath);
                }}
                size={13}
              />
            </button>
          );
        })}
      </div>
      <header>
        <span>{path}</span>
        <WorkspaceSwitcher
          currentWorkspace={currentWorkspace}
          onSelectWorkspace={onSelectWorkspace}
          workspaces={workspaces}
        />
        <button disabled={!dirty} onClick={() => void save(path)} type="button">
          <Save size={14} /> Save
        </button>
      </header>
      {document.loading || !monacoReady ? (
        <div className="file-loading"><LoaderCircle size={18} /> Reading {fileName(path)}...</div>
      ) : document.error ? (
        <div className="inline-error">{document.error}</div>
      ) : (
        <Editor
          height="100%"
          language={languageFor(path)}
          loading={<div className="file-loading"><LoaderCircle size={18} /> Starting editor...</div>}
          onChange={(content) =>
            setDocuments((current) => ({
              ...current,
              [path]: { ...current[path]!, content: content ?? "" }
            }))
          }
          options={{
            automaticLayout: true,
            cursorSmoothCaretAnimation: "on",
            fontSize: 13,
            minimap: { enabled: false },
            padding: { top: 14 },
            scrollBeyondLastLine: false,
            smoothScrolling: true
          }}
          path={modelPath(path)}
          theme={theme === "dark" ? "vs-dark" : "vs"}
          value={document.content}
        />
      )}
    </section>
  );
}

function fileName(path: string) {
  return path.split(/[\\/]/).at(-1) ?? path;
}

function languageFor(path: string) {
  const extension = path.split(".").at(-1)?.toLowerCase();
  return (
    (
      {
        css: "css",
        html: "html",
        json: "json",
        md: "markdown",
        py: "python",
        rs: "rust",
        ts: "typescript",
        tsx: "typescript"
      } as Record<string, string>
    )[extension ?? ""] ?? "plaintext"
  );
}

function modelPath(path: string) {
  return `file:///${path.replaceAll("\\", "/")}`;
}
