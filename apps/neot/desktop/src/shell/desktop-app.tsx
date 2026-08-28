import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Bot,
  BrainCircuit,
  Box,
  CircleDot,
  CloudCog,
  Files,
  FolderKanban,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  Menu,
  PanelBottom,
  Search,
  ServerCog,
  Settings,
  SlidersHorizontal,
  Workflow
} from "lucide-react";
import { AgentWorkspace } from "../workspaces/agent-workspace";
import { TaskRunnerWorkspace } from "../workspaces/task-runner-workspace";
import { CompassRunnerWorkspace } from "../workspaces/compass-runner-workspace";
import { DesktopSetup } from "../workspaces/desktop-setup";
import { WorkGroupSetup } from "../workspaces/work-group-setup";
import { AppDrawer } from "./app-drawer";
import { OpenInMenu } from "./open-in-menu";
import { CommandPalette, type PaletteCommand } from "./command-palette";
import { UpdateButton, UpdateCenter, VersionUpdateButton } from "../updates/update-center";
import { useDesktopUpdater } from "../updates/use-desktop-updater";
import { useDesktopSession } from "./use-desktop-session";
import { useDesktopUiStore } from "./use-desktop-ui-store";
import { resourcesForActivity } from "./startup-scheduler";
import { desktopClient } from "../services/desktop-client";

type Theme = "dark" | "light" | "system";

const EditorWorkspace = lazy(() =>
  import("../workspaces/editor-workspace").then((module) => ({ default: module.EditorWorkspace }))
);
const GitDiffWorkspace = lazy(() =>
  import("../workspaces/git-diff-workspace").then((module) => ({
    default: module.GitDiffWorkspace
  }))
);
const TerminalPanel = lazy(() =>
  import("../workspaces/terminal-panel").then((module) => ({ default: module.TerminalPanel }))
);
const DesktopSidePanel = lazy(() =>
  import("./desktop-side-panel").then((module) => ({ default: module.DesktopSidePanel }))
);
const PortalWorkspace = lazy(() =>
  import("../workspaces/portal-workspace").then((module) => ({
    default: module.PortalWorkspace
  }))
);
const SettingsPanel = lazy(() =>
  import("../workspaces/settings-panel").then((module) => ({
    default: module.SettingsPanel
  }))
);
const ProjectOverview = lazy(() =>
  import("../workspaces/project-overview").then((module) => ({ default: module.ProjectOverview }))
);
const ProjectSummary = lazy(() =>
  import("../workspaces/project-summary").then((module) => ({ default: module.ProjectSummary }))
);
const ProjectDetails = lazy(() =>
  import("../workspaces/project-details").then((module) => ({ default: module.ProjectDetails }))
);
const ProjectChangelog = lazy(() =>
  import("../workspaces/project-changelog").then((module) => ({ default: module.ProjectChangelog }))
);
const ProjectGitStatus = lazy(() =>
  import("../workspaces/project-git-status").then((module) => ({ default: module.ProjectGitStatus }))
);
const ProjectIdeas = lazy(() =>
  import("../workspaces/project-ideas").then((module) => ({ default: module.ProjectIdeas }))
);
export const activities = [
  { icon: LayoutDashboard, id: "overview", label: "Overview" },
  { icon: FolderKanban, id: "projects", label: "Projects" },
  { icon: Bot, id: "assist", label: "Agent" },
  { icon: Files, id: "files", label: "Explorer" },
  { icon: Search, id: "search", label: "Search" },
  { icon: GitBranch, id: "git", label: "Source control" },
  { icon: ListTodo, id: "tasks", label: "Tasks" },
  { icon: Workflow, id: "compass", label: "Compass Runner" },
  { icon: BrainCircuit, id: "learning", label: "Project learning" },
  { icon: Box, id: "docker", label: "Docker" },
  { icon: SlidersHorizontal, id: "settings", label: "Settings" },
  { icon: ServerCog, id: "hostinger", label: "Hostinger infrastructure" },
  { icon: CloudCog, id: "sync", label: "Local-first sync" }
] as const;

export function DesktopApp() {
  const ui = useDesktopUiStore();
  const { togglePalette, toggleTerminal } = ui;
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("neot-theme");
    return saved === "dark" || saved === "light" || saved === "system" ? saved : "dark";
  });
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [selectedPath, setSelectedPath] = useState<string>();
  const [editorStarted, setEditorStarted] = useState(false);
  const [selectedProjectPath, setSelectedProjectPath] = useState<string>();
  const [selectedProjectPage, setSelectedProjectPage] = useState<"details" | "changelog" | "git" | "ideas">("details");
  const [workGroupOpen, setWorkGroupOpen] = useState(false);
  const updater = useDesktopUpdater();
  const session = useDesktopSession();
  const {
    changes,
    changesState,
    files,
    filesState,
    loadFiles,
    loadSystem,
    refreshChanges,
    system,
    workspace
  } = session;
  const selectedChange = changes.find((change) => change.path === selectedPath);

  const selectedProject = session.desktopSetup?.workspaces.find((item) => item.path === selectedProjectPath);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    localStorage.setItem("neot-theme", theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    setSelectedPath(undefined);
  }, [workspace?.path]);

  useEffect(() => {
    if (ui.activity === "git" && changes.length && !selectedChange) {
      setSelectedPath(changes[0]?.path);
    }
  }, [changes, selectedChange, ui.activity]);

  useEffect(() => {
    if (selectedPath) setEditorStarted(true);
  }, [selectedPath]);

  useEffect(() => {
    if (!workspace) return;
    const resources = resourcesForActivity(ui.activity);
    if (resources.files && filesState === "idle") void loadFiles();
    if (resources.changes && changesState === "idle") void refreshChanges();
    if (resources.system && !system) void loadSystem();
  }, [
    changesState,
    filesState,
    loadFiles,
    loadSystem,
    refreshChanges,
    system,
    ui.activity,
    workspace
  ]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "`") {
        event.preventDefault();
        toggleTerminal();
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [togglePalette, toggleTerminal]);

  useEffect(() => {
    const openTerminal = () => ui.setTerminalOpen(true);
    window.addEventListener("neot:open-terminal", openTerminal);
    return () => window.removeEventListener("neot:open-terminal", openTerminal);
  }, [ui.setTerminalOpen]);

  const panelTitle = useMemo(
    () => activities.find((item) => item.id === ui.activity)?.label ?? "Explorer",
    [ui.activity]
  );
  const titlebarLabel = ui.activity === "tasks" ? "Task orchestration" : ui.activity === "compass" ? "Compass Runner" : panelTitle;

  const paletteCommands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "open-workspace",
        label: "Open workspace",
        detail: "Choose a local repository",
        run: () => void session.openWorkspace()
      },
      ...activities.map((item) => ({
        id: `activity-${item.id}`,
        label: `Show ${item.label}`,
        detail: "Workspace view",
        run: () => ui.setActivity(item.id)
      })),
      {
        id: "toggle-terminal",
        label: ui.terminalOpen ? "Hide terminal" : "Show terminal",
        detail: "Ctrl + `",
        run: ui.toggleTerminal
      },
      {
        id: "desktop-updates",
        label: "Check for updates",
        detail: "Download signed releases",
        run: () => ui.setUpdateOpen(true)
      },
      ...(["system", "light", "dark"] as const).map((option) => ({
        id: `theme-${option}`,
        label: `Use ${option} theme`,
        detail: "Appearance",
        run: () => setTheme(option)
      })),
      ...files
        .filter((file) => file.kind === "file")
        .map((file) => ({
          id: `file-${file.path}`,
          label: file.name,
          detail: file.path,
          run: () => {
            setSelectedPath(file.path);
            ui.setActivity("files");
          }
        }))
    ],
    [files, ui.setActivity, ui.setUpdateOpen, ui.terminalOpen, ui.toggleTerminal]
  );

  if (!workspace || workGroupOpen) {
    if (!session.desktopSetup || !session.desktopSetup.profile)
      return (
        <DesktopSetup
          onComplete={async () => {
            await session.refreshDesktopSetup();
          }}
          setup={session.desktopSetup}
        />
      );
    return (
      <>
        <WorkGroupSetup
          onOpenWorkspace={session.openWorkspace}
          onRefresh={async () => {
            await session.refreshDesktopSetup();
          }}
          onReturn={workspace ? () => setWorkGroupOpen(false) : undefined}
          profile={session.desktopSetup.profile}
        />
        <div className="setup-update">
          <UpdateButton onOpen={() => ui.setUpdateOpen(true)} update={updater} />
        </div>
        {ui.paletteOpen ? (
          <CommandPalette commands={paletteCommands} onClose={() => ui.setPaletteOpen(false)} />
        ) : null}
        {ui.updateOpen ? (
          <UpdateCenter onClose={() => ui.setUpdateOpen(false)} update={updater} />
        ) : null}
      </>
    );
  }

  return (
    <div className="ide">
      <header className="titlebar">
        <div className="window-mark">
          <button
            aria-label="Open application menu"
            className="menu-trigger"
            onClick={() => ui.setDrawerOpen(true)}
            type="button"
          >
            <Menu size={18} />
          </button>
          {titlebarLabel}
        </div>
        <button className="command-center" onClick={() => ui.setPaletteOpen(true)} type="button">
          <Search size={14} /> Search commands and files <kbd>Ctrl K</kbd>
        </button>
        <div className="title-actions">
          <span className="environment-pill">Local / {workspace.branch}</span>
          <OpenInMenu path={selectedPath} />
          <UpdateButton onOpen={() => ui.setUpdateOpen(true)} update={updater} />
        </div>
      </header>
      <div
        className={
          ui.activity === "assist" ||
          ui.activity === "tasks" ||
          ui.activity === "compass" ||
          ui.activity === "overview" ||
          ui.activity === "projects" ||
          ui.activity === "settings" ||
          ui.activity === "hostinger" ||
          ui.activity === "sync"
            ? "ide-body agent-active"
            : "ide-body"
        }
      >
        <nav className="activity-bar" aria-label="IDE activities">
          <div>
            {activities.map((item) => (
              <button
                aria-label={item.label}
                className={ui.activity === item.id ? "active" : ""}
                key={item.id}
                onClick={() => ui.setActivity(item.id)}
                title={item.label}
                type="button"
              >
                <item.icon size={21} />
              </button>
            ))}
          </div>
          <button aria-label="Open settings" onClick={() => ui.setDrawerOpen(true)} type="button">
            <Settings size={21} />
          </button>
        </nav>
        {!isFullWorkspace(ui.activity) ? (
          <aside className="side-panel">
            <div className="panel-heading">{panelTitle}</div>
            <Suspense fallback={<div className="panel-progress">Loading view...</div>}>
              <DesktopSidePanel
                activity={ui.activity}
                changes={changes}
                changesState={session.changesState}
                files={files}
                filesState={session.filesState}
                onOpenWorkspace={() => void session.openWorkspace()}
                onRefreshChanges={session.refreshChanges}
                onSelectChange={(change) => setSelectedPath(change.path)}
                onSelectFile={setSelectedPath}
                selectedPath={selectedPath}
                system={system}
                workspace={workspace}
              />
            </Suspense>
          </aside>
        ) : null}
        <main
          className={`workbench${ui.activity === "assist" ? " agent-workbench" : ""}${ui.terminalOpen ? " terminal-visible" : ""}`}
        >
          {ui.activity === "assist" ? <div className="workspace-surface">
            <AgentWorkspace
              changes={changes}
              changesState={session.changesState}
              files={files}
              filesState={session.filesState}
              key={workspace.path}
              onOpenFile={(path) => {
                setSelectedPath(path);
                ui.setActivity("files");
              }}
              onOpenProjectOverview={() => ui.setActivity("overview")}
              onRefreshChanges={session.refreshChanges}
              workspace={workspace}
            />
          </div> : null}
          {ui.activity === "tasks" ? <div className="workspace-surface"><TaskRunnerWorkspace onRefreshChanges={session.refreshChanges} /></div> : null}
          {ui.activity === "compass" ? <div className="workspace-surface"><CompassRunnerWorkspace /></div> : null}
          {ui.activity === "projects" ? (
            <div className="workspace-surface">
              <Suspense fallback={<div className="workspace-loading">Loading projects...</div>}>
                {selectedProject && selectedProjectPage === "changelog" ? <ProjectChangelog onReturn={() => setSelectedProjectPage("details")} onSaveDetails={async (project) => { await desktopClient.saveDesktopProjectDetails(project); await session.refreshDesktopSetup(); }} workspace={selectedProject} /> : selectedProject && selectedProjectPage === "git" ? <ProjectGitStatus onOpenTaskRunner={() => { setSelectedProjectPage("details"); ui.setActivity("tasks"); }} onReturn={() => setSelectedProjectPage("details")} workspace={selectedProject} /> : selectedProject && selectedProjectPage === "ideas" ? <ProjectIdeas onReturn={() => setSelectedProjectPage("details")} workspace={selectedProject} /> : selectedProject ? <ProjectDetails defaultProjectPath={session.desktopSetup?.defaultWorkspacePath} onOpenChangelog={() => setSelectedProjectPage("changelog")} onOpenGitStatus={() => setSelectedProjectPage("git")} onOpenIdeas={() => setSelectedProjectPage("ideas")} onReturn={() => { setSelectedProjectPath(undefined); setSelectedProjectPage("details"); }} onToggleDefault={async (path, isDefault) => {
                  if (isDefault) await desktopClient.clearDefaultDesktopWorkspace();
                  else await desktopClient.setDefaultDesktopWorkspace(path);
                  await session.refreshDesktopSetup();
                }} onSaveDetails={async (project) => {
                  await desktopClient.saveDesktopProjectDetails(project);
                  await session.refreshDesktopSetup();
                }} workspace={selectedProject} /> : <ProjectOverview
                  onOpenFolderSettings={() => setWorkGroupOpen(true)}
                  onOpenProject={(path) => { setSelectedProjectPath(path); setSelectedProjectPage("details"); }}
                  onSetDefaultProject={async (path) => {
                    await desktopClient.setDefaultDesktopWorkspace(path);
                    await session.refreshDesktopSetup();
                  }}
                  defaultProjectPath={session.desktopSetup?.defaultWorkspacePath}
                  workspaceFolder={session.desktopSetup?.profile?.defaultWorkGroupPath}
                  workspaces={session.desktopSetup?.workspaces ?? []}
                />}
              </Suspense>
            </div>
          ) : null}
          {ui.activity === "overview" ? (
            <div className="workspace-surface project-summary-surface">
              <Suspense
                fallback={<div className="workspace-loading">Loading project overview...</div>}
              >
                <ProjectSummary
                  activeProjectCount={(session.desktopSetup?.workspaces ?? []).filter((item) => item.relationship === "project").length}
                  addOnProjectCount={(session.desktopSetup?.workspaces ?? []).filter((item) => item.relationship === "addOn" || item.kind === "plugin").length}
                  displayName={session.desktopSetup?.profile?.displayName}
                  onOpenProjects={() => ui.setActivity("projects")}
                  onWorkspaceFolderChanged={session.refreshDesktopSetup}
                  workspaceFolder={session.desktopSetup?.profile?.defaultWorkGroupPath}
                />
              </Suspense>
            </div>
          ) : null}
          {ui.activity === "settings" ? (
            <div className="workspace-surface">
              <Suspense fallback={<div className="workspace-loading">Loading settings...</div>}>
                <SettingsPanel
                  currentWorkspace={workspace}
                  onClose={() => ui.setActivity("assist")}
                  onOpenWorkspace={session.openWorkspace}
                />
              </Suspense>
            </div>
          ) : null}
          {ui.activity === "hostinger" ? (
            <div className="workspace-surface">
              <Suspense fallback={<div className="workspace-loading">Loading Hostinger...</div>}>
                <PortalWorkspace
                  description="VPS health, Hostinger metrics, Docker projects, and credentials."
                  path="/app/neot/hostinger"
                  title="Hostinger infrastructure"
                />
              </Suspense>
            </div>
          ) : null}
          {ui.activity === "sync" ? (
            <div className="workspace-surface">
              <Suspense fallback={<div className="workspace-loading">Loading sync...</div>}>
                <PortalWorkspace
                  description="Connect local work data to NEOT Cloud and control synchronization."
                  path="/app/neot/project-sync"
                  title="Local-first sync"
                />
              </Suspense>
            </div>
          ) : null}
          {editorStarted ? (
            <div
              className="workspace-surface"
              hidden={
                ui.activity === "assist" ||
                isFullWorkspace(ui.activity) ||
                (ui.activity === "git" && Boolean(selectedChange))
              }
            >
              <Suspense fallback={<div className="workspace-loading">Loading editor...</div>}>
                <EditorWorkspace
                  key={workspace.path}
                  currentWorkspace={workspace}
                  onSelectWorkspace={(path) => void session.openWorkspace(path)}
                  onSelectPath={setSelectedPath}
                  path={selectedPath}
                  theme={resolvedTheme}
                  workspaces={session.desktopSetup?.workspaces ?? []}
                />
              </Suspense>
            </div>
          ) : null}
          {ui.activity === "git" && selectedChange ? (
            <div className="workspace-surface">
              <Suspense
                fallback={<div className="workspace-loading">Loading diff reviewer...</div>}
              >
                <GitDiffWorkspace change={selectedChange} theme={resolvedTheme} />
              </Suspense>
            </div>
          ) : null}
          {ui.terminalOpen ? <TerminalPanel theme={resolvedTheme} workspace={workspace} /> : null}
        </main>
      </div>
      <footer className="statusbar">
        <VersionUpdateButton onOpen={() => ui.setUpdateOpen(true)} update={updater} />
        <span>
          <GitBranch size={13} /> {workspace.branch}
        </span>
        <span>
          <CircleDot size={13} />
          {session.changesState === "loading" ? "Refreshing Git" : `${changes.length} changes`}
        </span>
        <span className="status-spacer" />
        <span>{system?.platform ?? "desktop"}</span>
        <button onClick={ui.toggleTerminal} type="button">
          <PanelBottom size={13} /> Terminal
        </button>
      </footer>
      <AppDrawer
        onClose={() => ui.setDrawerOpen(false)}
        onOpenCommands={() => ui.setPaletteOpen(true)}
        onOpenSettings={() => ui.setActivity("settings")}
        onOpenUpdates={() => ui.setUpdateOpen(true)}
        onOpenWorkGroup={() => setWorkGroupOpen(true)}
        onOpenWorkspace={() => void session.openWorkspace()}
        onSelectWorkspace={(path) => void session.openWorkspace(path)}
        onThemeChange={setTheme}
        onToggleTerminal={ui.toggleTerminal}
        open={ui.drawerOpen}
        terminalOpen={ui.terminalOpen}
        theme={theme}
        workspaces={session.desktopSetup?.workspaces ?? []}
      />
      {ui.paletteOpen ? (
        <CommandPalette commands={paletteCommands} onClose={() => ui.setPaletteOpen(false)} />
      ) : null}
      {ui.updateOpen ? (
        <UpdateCenter onClose={() => ui.setUpdateOpen(false)} update={updater} />
      ) : null}
    </div>
  );
}


function isFullWorkspace(activity: string) {
  return ["assist", "tasks", "compass", "hostinger", "overview", "projects", "settings", "sync"].includes(activity);
}
