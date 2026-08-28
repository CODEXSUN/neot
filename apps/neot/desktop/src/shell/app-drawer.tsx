import {
  Download,
  Blocks,
  FolderGit2,
  FolderOpen,
  PanelBottom,
  Puzzle,
  Search,
  Settings,
  SlidersHorizontal,
  X
} from "lucide-react";
import { useEffect } from "react";
import neotLogo from "../../assets/brand-icon.svg";
import type { DesktopWorkspace } from "../contracts/desktop";

type Theme = "dark" | "light" | "system";

export function AppDrawer({
  onClose,
  onOpenCommands,
  onOpenSettings,
  onOpenUpdates,
  onOpenWorkGroup,
  onOpenWorkspace,
  onSelectWorkspace,
  onThemeChange,
  onToggleTerminal,
  open,
  terminalOpen,
  theme,
  workspaces
}: {
  onClose: () => void;
  onOpenCommands: () => void;
  onOpenSettings: () => void;
  onOpenUpdates: () => void;
  onOpenWorkGroup: () => void;
  onOpenWorkspace: () => void;
  onSelectWorkspace: (path: string) => void;
  onThemeChange: (theme: Theme) => void;
  onToggleTerminal: () => void;
  open: boolean;
  terminalOpen: boolean;
  theme: Theme;
  workspaces: DesktopWorkspace[];
}) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const actions = [
    { icon: FolderGit2, label: "Folders & repositories", onSelect: onOpenWorkGroup },
    { icon: FolderOpen, label: "Open any folder", onSelect: onOpenWorkspace },
    { icon: Search, label: "Command palette", onSelect: onOpenCommands },
    { icon: SlidersHorizontal, label: "Settings", onSelect: onOpenSettings },
    {
      icon: PanelBottom,
      label: terminalOpen ? "Hide terminal" : "Show terminal",
      onSelect: onToggleTerminal
    },
    { icon: Download, label: "Check for updates", onSelect: onOpenUpdates }
  ];

  function select(action: () => void) {
    action();
    onClose();
  }

  return (
    <div className="app-drawer-layer">
      <button
        aria-label="Close menu"
        className="app-drawer-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside aria-label="NEOT menu" aria-modal="true" className="app-drawer" role="dialog">
        <header>
          <span>
            <img alt="" className="product-icon" src={neotLogo} />
            <span>NEOT</span>
          </span>
          <button aria-label="Close menu" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>
        <nav aria-label="Application actions">
          {actions.map((action) => (
            <button key={action.label} onClick={() => select(action.onSelect)} type="button">
              <action.icon size={18} />
              <span>{action.label}</span>
            </button>
          ))}
        </nav>
        <RepositoryGroups
          onSelectWorkspace={(path) => select(() => onSelectWorkspace(path))}
          workspaces={workspaces}
        />
        <section className="drawer-settings">
          <h2>
            <Settings size={16} /> Settings
          </h2>
          <span>Theme</span>
          <div className="drawer-theme-options">
            {(["system", "light", "dark"] as const).map((option) => (
              <button
                aria-pressed={theme === option}
                className={theme === option ? "active" : ""}
                key={option}
                onClick={() => onThemeChange(option)}
                type="button"
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function RepositoryGroups({
  onSelectWorkspace,
  workspaces
}: {
  onSelectWorkspace: (path: string) => void;
  workspaces: DesktopWorkspace[];
}) {
  const projects = workspaces.filter((workspace) => workspace.relationship === "project");
  const addOnProjects = workspaces.filter((workspace) => workspace.relationship === "addOn");
  const plugins = workspaces.filter(
    (workspace) => workspace.kind === "plugin" && workspace.relationship !== "addOn"
  );
  if (projects.length === 0 && addOnProjects.length === 0 && plugins.length === 0) return null;

  return (
    <section className="drawer-repositories">
      <RepositoryGroup
        icon={FolderGit2}
        label="Projects"
        onSelectWorkspace={onSelectWorkspace}
        workspaces={projects}
      />
      <RepositoryGroup
        icon={Blocks}
        label="Add-on projects"
        onSelectWorkspace={onSelectWorkspace}
        workspaces={addOnProjects}
      />
      <RepositoryGroup
        icon={Puzzle}
        label="Plugins"
        onSelectWorkspace={onSelectWorkspace}
        workspaces={plugins}
      />
    </section>
  );
}

function RepositoryGroup({
  icon: Icon,
  label,
  onSelectWorkspace,
  workspaces
}: {
  icon: typeof FolderGit2;
  label: string;
  onSelectWorkspace: (path: string) => void;
  workspaces: DesktopWorkspace[];
}) {
  if (workspaces.length === 0) return null;
  return (
    <div className="drawer-repository-group">
      <h2>
        <Icon size={15} /> {label}
      </h2>
      {workspaces.map((workspace) => (
        <button
          key={workspace.path}
          onClick={() => onSelectWorkspace(workspace.path)}
          type="button"
        >
          <span>{workspace.name}</span>
          <small>{workspace.kind === "plugin" ? "Plugin" : "Folder"}</small>
        </button>
      ))}
    </div>
  );
}
