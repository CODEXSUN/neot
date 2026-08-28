import { Folder, FolderPlus, SlidersHorizontal } from "lucide-react";
import type { FileEntry, GitChange, SystemStatus, Workspace } from "../contracts/desktop";
import { FileTree } from "../workspaces/file-tree";
import { GitPanel } from "../workspaces/git-panel";
import { RuntimePanel } from "../workspaces/runtime-panel";
import { SearchPanel } from "../workspaces/search-panel";
import { SkillsPanel } from "../workspaces/skills-panel";
import type { ResourceState } from "./use-desktop-session";

export type Activity =
  | "assist"
  | "docker"
  | "files"
  | "git"
  | "hostinger"
  | "learning"
  | "overview"
  | "projects"
  | "search"
  | "settings"
  | "compass"
  | "sync"
  | "tasks";

export function DesktopSidePanel({
  activity,
  changes,
  changesState,
  files,
  filesState,
  onAddContext,
  onOpenWorkspace,
  onRefreshChanges,
  onSelectChange,
  onSelectFile,
  selectedPath,
  system,
  workspace
}: {
  activity: Activity;
  changes: GitChange[];
  changesState: ResourceState;
  files: FileEntry[];
  filesState: ResourceState;
  onAddContext?: ((path: string) => void) | undefined;
  onOpenWorkspace?: (() => void) | undefined;
  onRefreshChanges: () => Promise<void>;
  onSelectChange: (change: GitChange) => void;
  onSelectFile: (path: string) => void;
  selectedPath: string | undefined;
  system: SystemStatus | undefined;
  workspace: Workspace;
}) {
  if (activity === "git" && changesState === "loading") {
    return <PanelProgress label="Refreshing source control" />;
  }
  if (activity === "git") {
    return (
      <GitPanel
        changes={changes}
        onRefresh={onRefreshChanges}
        onSelectChange={onSelectChange}
        selectedPath={selectedPath}
        workspacePath={workspace.path}
      />
    );
  }
  if (activity === "search") return <SearchPanel onOpen={onSelectFile} />;
  if (activity === "learning") return <SkillsPanel onOpen={onSelectFile} />;
  if (activity === "docker") return <RuntimePanel system={system} />;
  if (activity !== "files") return <EmptyPanel activity={activity} />;
  if (filesState === "loading") return <PanelProgress label="Reading workspace files" />;
  if (filesState === "unavailable") return <PanelProgress label="Files are unavailable" />;
  return (
    <div className="tree">
      <div className="tree-header-actions">
        <div className="tree-section" title={workspace.path}>
          <Folder size={14} className="tree-folder-icon" />
          <span className="tree-workspace-title">{workspace.name}</span>
        </div>
        {onOpenWorkspace && (
          <button
            type="button"
            className="tree-switch-btn"
            onClick={() => onOpenWorkspace()}
            title="Open or switch workspace folder"
          >
            <FolderPlus size={13} />
            <span>Switch</span>
          </button>
        )}
      </div>
      <FileTree
        entries={files}
        onSelect={onSelectFile}
        onAddContext={onAddContext}
        onOpenWorkspace={onOpenWorkspace}
        selectedPath={selectedPath}
      />
    </div>
  );
}

function PanelProgress({ label }: { label: string }) {
  return (
    <div className="panel-progress" role="status">
      <span />
      {label}
    </div>
  );
}

function EmptyPanel({ activity }: { activity: Activity }) {
  const descriptions: Record<Activity, string> = {
    assist: "Connect Assist to plan, edit, review, and verify this workspace.",
    compass: "Run standalone sales and CRM workflow prototypes without connecting to NEOT tasks.",
    docker: "Inspect services and run approved Docker operations.",
    files: "Open a workspace to browse files.",
    git: "Open a Git repository to review changes.",
    hostinger: "Manage Hostinger VPS infrastructure through the connected NEOT server.",
    learning: "Review project facts before the coding agent uses them.",
    overview: "Review the selected project and repository connection.",
    projects: "Review connected projects and their local workspace details.",
    search: "Search every text file in this workspace.",
    settings: "Configure agent, appearance, and advanced options.",
    sync: "Connect this local-first workspace to NEOT Cloud.",
    tasks: "Plan and run local tasks."
  };
  return (
    <div className="empty-panel">
      <SlidersHorizontal size={20} />
      <p>{descriptions[activity]}</p>
    </div>
  );
}
