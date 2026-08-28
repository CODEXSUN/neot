import { Blocks, ChevronDown, Ellipsis, Folder, FolderOpen, MessageSquare, MessageSquarePlus, Pin, PinOff, Puzzle, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { AgentTask, DesktopWorkspace, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function ProjectConversationAccordion({ activeTaskId, agentWorking, currentWorkspace, onNewChat, onOpenTask, onRefreshWorkspaces, onSelectWorkspace, tasks, workspaces }: {
  activeTaskId: number | undefined;
  agentWorking: boolean;
  currentWorkspace: Workspace;
  onNewChat: () => void;
  onOpenTask: (task: AgentTask) => void;
  onRefreshWorkspaces: () => Promise<unknown>;
  onSelectWorkspace: (path: string) => void;
  tasks: AgentTask[];
  workspaces: DesktopWorkspace[];
}) {
  const [expandedPath, setExpandedPath] = useState(currentWorkspace.path);
  useEffect(() => setExpandedPath(currentWorkspace.path), [currentWorkspace.path]);

  return <section className="project-conversation-accordion">
    <ProjectGroup activeTaskId={activeTaskId} agentWorking={agentWorking} currentWorkspace={currentWorkspace} expandedPath={expandedPath} icon={Folder} label="Projects" onNewChat={onNewChat} onOpenTask={onOpenTask} onRefreshWorkspaces={onRefreshWorkspaces} onSelectWorkspace={onSelectWorkspace} onToggle={(path) => setExpandedPath((current) => current === path ? "" : path)} tasks={tasks} workspaces={workspaces.filter((workspace) => workspace.relationship === "project")} />
    <ProjectGroup activeTaskId={activeTaskId} agentWorking={agentWorking} currentWorkspace={currentWorkspace} expandedPath={expandedPath} icon={Blocks} label="Add-on projects" onNewChat={onNewChat} onOpenTask={onOpenTask} onRefreshWorkspaces={onRefreshWorkspaces} onSelectWorkspace={onSelectWorkspace} onToggle={(path) => setExpandedPath((current) => current === path ? "" : path)} tasks={tasks} workspaces={workspaces.filter((workspace) => workspace.relationship === "addOn")} />
    <ProjectGroup activeTaskId={activeTaskId} agentWorking={agentWorking} currentWorkspace={currentWorkspace} expandedPath={expandedPath} icon={Puzzle} label="Plugins" onNewChat={onNewChat} onOpenTask={onOpenTask} onRefreshWorkspaces={onRefreshWorkspaces} onSelectWorkspace={onSelectWorkspace} onToggle={(path) => setExpandedPath((current) => current === path ? "" : path)} tasks={tasks} workspaces={workspaces.filter((workspace) => workspace.kind === "plugin" && workspace.relationship !== "addOn")} />
  </section>;
}

function ProjectGroup({ activeTaskId, agentWorking, currentWorkspace, expandedPath, icon: Icon, label, onNewChat, onOpenTask, onRefreshWorkspaces, onSelectWorkspace, onToggle, tasks, workspaces }: {
  activeTaskId: number | undefined;
  agentWorking: boolean;
  currentWorkspace: Workspace;
  expandedPath: string;
  icon: LucideIcon;
  label: string;
  onNewChat: () => void;
  onOpenTask: (task: AgentTask) => void;
  onRefreshWorkspaces: () => Promise<unknown>;
  onSelectWorkspace: (path: string) => void;
  onToggle: (path: string) => void;
  tasks: AgentTask[];
  workspaces: DesktopWorkspace[];
}) {
  const [actionError, setActionError] = useState<string>();
  const [removing, setRemoving] = useState<DesktopWorkspace>();
  const [savingPath, setSavingPath] = useState<string>();
  if (workspaces.length === 0) return null;

  async function runAction(path: string, action: () => Promise<void>) {
    setActionError(undefined);
    setSavingPath(path);
    try { await action(); } catch (reason) { setActionError(reason instanceof Error ? reason.message : String(reason)); } finally { setSavingPath(undefined); }
  }

  function startNewChat(workspace: DesktopWorkspace) {
    if (workspace.path !== currentWorkspace.path) onSelectWorkspace(workspace.path);
    onNewChat();
  }

  return <div className="project-accordion-group">
    <h2><Icon size={14} /> {label}</h2>
    {workspaces.map((workspace) => {
      const active = workspace.path === currentWorkspace.path;
      const expanded = active && expandedPath === workspace.path;
      const saving = savingPath === workspace.path;
      return <div className={`project-accordion-item${active ? " active" : ""}`} key={workspace.path}>
        <div className="project-accordion-row">
          <button aria-expanded={expanded} className="project-accordion-select" onClick={() => active ? onToggle(workspace.path) : onSelectWorkspace(workspace.path)} type="button">
            <Folder size={18} strokeWidth={1.8} /><span>{workspace.name}</span>{active ? <span aria-label={agentWorking ? "Agent working" : "Selected project"} className={`project-activity-light${agentWorking ? " working" : ""}`} role="status" /> : null}{workspace.pinned ? <Pin aria-label="Pinned project" size={13} /> : null}<ChevronDown className={expanded ? "expanded" : ""} size={14} />
          </button>
          <div className="project-accordion-actions">
            <button aria-label={`New chat for ${workspace.name}`} disabled={saving} onClick={() => startNewChat(workspace)} title="New chat" type="button"><MessageSquarePlus size={15} /></button>
            <details className="project-action-menu">
              <summary aria-label={`More actions for ${workspace.name}`} title="Project actions"><Ellipsis size={16} /></summary>
              <div role="menu">
                <button disabled={saving} onClick={() => void runAction(workspace.path, async () => { await desktopClient.setDesktopWorkspacePinned(workspace.path, !workspace.pinned); await onRefreshWorkspaces(); })} role="menuitem" type="button">{workspace.pinned ? <PinOff size={15} /> : <Pin size={15} />}{workspace.pinned ? "Unpin" : "Pin"}</button>
                <button disabled={saving} onClick={() => void runAction(workspace.path, () => desktopClient.openWorkspaceFolder(workspace.path))} role="menuitem" type="button"><FolderOpen size={15} />Open folder</button>
                <button className="danger" disabled={saving} onClick={() => setRemoving(workspace)} role="menuitem" type="button"><Trash2 size={15} />Remove</button>
              </div>
            </details>
          </div>
        </div>
        {expanded ? <ProjectChats activeTaskId={activeTaskId} onOpenTask={onOpenTask} tasks={tasks} /> : null}
      </div>;
    })}
    {actionError ? <p className="project-accordion-error" role="alert">{actionError}</p> : null}
    {removing ? <RemoveProjectDialog busy={savingPath === removing.path} name={removing.name} onCancel={() => setRemoving(undefined)} onConfirm={() => void runAction(removing.path, async () => { await desktopClient.removeDesktopWorkspace(removing.path); await onRefreshWorkspaces(); setRemoving(undefined); })} /> : null}
  </div>;
}

function ProjectChats({ activeTaskId, onOpenTask, tasks }: { activeTaskId: number | undefined; onOpenTask: (task: AgentTask) => void; tasks: AgentTask[] }) {
  if (tasks.length === 0) return <p className="project-accordion-empty">No chats yet</p>;
  return <div className="project-accordion-chats">{tasks.map((task) => <button className={task.id === activeTaskId ? "active" : ""} key={task.id} onClick={() => onOpenTask(task)} type="button"><MessageSquare size={13} /><span>{task.title}</span></button>)}</div>;
}

function RemoveProjectDialog({ busy, name, onCancel, onConfirm }: { busy: boolean; name: string; onCancel: () => void; onConfirm: () => void }) {
  return <div aria-modal="true" className="project-remove-dialog-backdrop" role="dialog"><div className="project-remove-dialog"><h3>Remove {name}?</h3><p>This removes its NEOT connection only. The folder and its Git repository stay unchanged.</p><div><button disabled={busy} onClick={onCancel} type="button">Cancel</button><button className="danger" disabled={busy} onClick={onConfirm} type="button">{busy ? "Removing…" : "Remove project"}</button></div></div></div>;
}
