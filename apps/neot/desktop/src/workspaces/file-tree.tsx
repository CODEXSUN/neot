import { ChevronDown, ChevronRight, ExternalLink, FileCode2, Folder, FolderOpen, Paperclip } from "lucide-react";
import { useState } from "react";
import type { FileEntry } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function FileTree({
  entries,
  onSelect,
  onAddContext,
  onOpenWorkspace,
  selectedPath
}: {
  entries: FileEntry[];
  onSelect: (path: string) => void;
  onAddContext?: ((path: string) => void) | undefined;
  onOpenWorkspace?: ((path?: string) => void) | undefined;
  selectedPath: string | undefined;
}) {
  return (
    <div className="tree-nodes">
      {entries.map((entry) => (
        <FileNode
          entry={entry}
          key={entry.path}
          onSelect={onSelect}
          onAddContext={onAddContext}
          onOpenWorkspace={onOpenWorkspace}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
}

function FileNode({
  entry,
  onSelect,
  onAddContext,
  onOpenWorkspace,
  selectedPath
}: {
  entry: FileEntry;
  onSelect: (path: string) => void;
  onAddContext?: ((path: string) => void) | undefined;
  onOpenWorkspace?: ((path?: string) => void) | undefined;
  selectedPath: string | undefined;
}) {
  const [children, setChildren] = useState<FileEntry[]>();
  const [expanded, setExpanded] = useState(false);
  const directory = entry.kind === "directory";

  async function activate() {
    if (!directory) return onSelect(entry.path);
    const next = !expanded;
    setExpanded(next);
    if (next && !children) {
      try {
        setChildren(await desktopClient.listFiles(entry.path));
      } catch {
        setChildren([]);
      }
    }
  }

  const Disclosure = expanded ? ChevronDown : ChevronRight;
  const EntryIcon = directory ? (expanded ? FolderOpen : Folder) : FileCode2;
  return (
    <div className="tree-node">
      <button
        className={selectedPath === entry.path ? "tree-row selected" : "tree-row"}
        onClick={() => void activate()}
        type="button"
        title={entry.path}
      >
        <span className="tree-disclosure">{directory ? <Disclosure size={13} /> : null}</span>
        <EntryIcon className="tree-entry-icon" size={14} />
        <span className="tree-label">{entry.name}</span>

        {directory && onOpenWorkspace && (
          <button
            type="button"
            className="tree-open-folder-btn"
            title="Open & connect this folder as active root workspace"
            onClick={(e) => {
              e.stopPropagation();
              onOpenWorkspace(entry.path);
            }}
          >
            <ExternalLink size={12} />
          </button>
        )}

        {!directory && onAddContext && (
          <button
            type="button"
            className="tree-attach-context-btn"
            title="Attach file to AI Agent context"
            onClick={(e) => {
              e.stopPropagation();
              onAddContext(entry.path);
            }}
          >
            <Paperclip size={12} />
          </button>
        )}
      </button>
      {expanded && children ? (
        <div className="tree-children">
          <FileTree
            entries={children}
            onSelect={onSelect}
            onAddContext={onAddContext}
            onOpenWorkspace={onOpenWorkspace}
            selectedPath={selectedPath}
          />
        </div>
      ) : null}
    </div>
  );
}
