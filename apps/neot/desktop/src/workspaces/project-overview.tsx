import { Blocks, Check, FolderGit2, FolderOpen, Settings2, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DesktopWorkspace } from "../contracts/desktop";

export function ProjectOverview({
  defaultProjectPath,
  onOpenFolderSettings,
  onOpenProject,
  onSetDefaultProject,
  workspaceFolder,
  workspaces
}: {
  defaultProjectPath: string | null | undefined;
  onOpenFolderSettings: () => void;
  onOpenProject: (path: string) => void;
  onSetDefaultProject: (path: string) => Promise<void>;
  workspaceFolder: string | null | undefined;
  workspaces: DesktopWorkspace[];
}) {
  const projects = workspaces.filter((workspace) => workspace.relationship === "project");
  const addOns = workspaces.filter((workspace) => workspace.relationship === "addOn" || workspace.kind === "plugin");
  const displayedWorkspaceCount = projects.length + addOns.length;
  const folder = workspaceFolder?.trim() || "No workspace folder configured";

  return <section className="project-overview">
    <header className="project-overview-header">
      <div><p>Local workspaces</p><h1>Projects</h1><span>Select a project to review its local repository details.</span></div>
      <div className="project-overview-meta"><button aria-label="Manage workspace folder and repositories" className="project-overview-settings" onClick={onOpenFolderSettings} title="Manage folder and repositories" type="button"><Settings2 size={16} /></button><span className="project-overview-folder-label">Workspace folder</span><strong title={folder}>{folder}</strong><em>{displayedWorkspaceCount} connected</em></div>
    </header>
    <ProjectSection defaultProjectPath={defaultProjectPath} icon={FolderGit2} label="Projects" onOpenProject={onOpenProject} onSetDefaultProject={onSetDefaultProject} workspaces={projects} />
    <ProjectSection defaultProjectPath={defaultProjectPath} icon={Blocks} label="Add-on projects" onOpenProject={onOpenProject} onSetDefaultProject={onSetDefaultProject} workspaces={addOns} />
  </section>;
}

function ProjectSection({
  defaultProjectPath,
  icon: Icon,
  label,
  onOpenProject,
  onSetDefaultProject,
  workspaces
}: {
  defaultProjectPath: string | null | undefined;
  icon: LucideIcon;
  label: string;
  onOpenProject: (path: string) => void;
  onSetDefaultProject: (path: string) => Promise<void>;
  workspaces: DesktopWorkspace[];
}) {
  if (workspaces.length === 0) return null;
  return <section className="project-overview-section">
    <h2><Icon size={16} /> {label}</h2>
    <div className="project-card-grid">
      {workspaces.map((workspace) => {
        const isDefault = workspace.path === defaultProjectPath;
        return <article className={`project-card${isDefault ? " default" : ""}`} key={workspace.path}>
          <ProjectCard
            defaultProjectPath={defaultProjectPath}
            onOpenProject={onOpenProject}
            onSetDefaultProject={onSetDefaultProject}
            workspace={workspace}
          />
        </article>;
      })}
    </div>
  </section>;
}

function ProjectCard({ defaultProjectPath, onOpenProject, onSetDefaultProject, workspace }: {
  defaultProjectPath: string | null | undefined;
  onOpenProject: (path: string) => void;
  onSetDefaultProject: (path: string) => Promise<void>;
  workspace: DesktopWorkspace;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDefault = workspace.path === defaultProjectPath;

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  async function setAsDefault() {
    setSaving(true);
    try {
      await onSetDefaultProject(workspace.path);
      setMenuOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return <div className="project-card-content" onContextMenu={(event) => { event.preventDefault(); setMenuOpen(true); }}>
    <header><span className="project-card-id" title={workspace.projectId ? `Project #${workspace.projectId}` : "Project ID is being assigned"}>{workspace.projectId ? `#${workspace.projectId}` : "#—"}</span><div><h3>{workspace.name}</h3><span>{workspace.kind === "plugin" ? "Plugin" : "Application"}</span></div></header>
    <p title={workspace.path}>{workspace.path}</p>
    <footer><span>{workspace.pinned ? "Pinned" : "Connected"}</span><button onClick={() => onOpenProject(workspace.path)} type="button"><FolderOpen size={14} /> Open project</button></footer>
    {menuOpen ? <div className="project-default-menu" ref={menuRef} role="menu"><button disabled={isDefault || saving} onClick={() => void setAsDefault()} role="menuitem" type="button"><Check size={14} /> {isDefault ? "Default project" : "Set as default"}</button></div> : null}
  </div>;
}
