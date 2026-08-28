import { FolderOpen, RotateCcw, Save, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { DesktopProfile, DesktopSetup, DesktopWorkspace, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { WorkGroupResetDialog } from "./work-group-reset-dialog";

export function WorkspaceIdentitySettings({ currentWorkspace, onOpenWorkspace }: { currentWorkspace?: Workspace | undefined; onOpenWorkspace: (path?: string) => Promise<void> }) {
  const [setup, setSetup] = useState<DesktopSetup>();
  const [message, setMessage] = useState<string>();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resettingWorkGroup, setResettingWorkGroup] = useState(false);

  useEffect(() => { void reload(); }, []);

  async function reload() {
    try { setSetup(await desktopClient.getDesktopSetup()); } catch (error) { setMessage(String(error)); }
  }

  async function saveProfile(profile: DesktopProfile) {
    try { await desktopClient.saveDesktopProfile(profile); setMessage("Local identity saved."); await reload(); } catch (error) { setMessage(String(error)); }
  }

  async function saveWorkspace(workspace: DesktopWorkspace) {
    try { await desktopClient.saveDesktopWorkspace(workspace); setMessage("Workspace mapping saved."); await reload(); } catch (error) { setMessage(String(error)); }
  }

  async function resetWorkGroup() {
    setResetDialogOpen(false);
    setResettingWorkGroup(true);
    try {
      await desktopClient.resetDesktopWorkGroup();
      setMessage("Work group reset. Connected repositories remain saved; setup will return on the next launch.");
      await reload();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setResettingWorkGroup(false);
    }
  }

  return <section className="settings-section workspace-identity-settings">
    <div className="section-header"><h2>Identity and workspaces</h2><p className="section-description">Manage the person using this local NEOT and map every local folder to a project, add-on, or standalone item.</p></div>
    {setup?.profile ? <ProfileForm profile={setup.profile} onSave={saveProfile} /> : <p className="settings-message error">A local identity has not been configured.</p>}
    {setup?.profile?.defaultWorkGroupPath ? <div className="workspace-group-setting"><div><strong>Default work group</strong><small>{setup.profile.defaultWorkGroupPath}</small></div><button className="workspace-group-reset-button" onClick={() => setResetDialogOpen(true)} type="button"><RotateCcw size={15} /> Reset work group</button></div> : null}
    <div className="workspace-mapping-header"><h3>Workspace map</h3><button onClick={() => void onOpenWorkspace()} type="button"><FolderOpen size={15} /> Add folder</button></div>
    {currentWorkspace ? <p className="workspace-current">Open now: <strong>{currentWorkspace.name}</strong> · {currentWorkspace.path}</p> : null}
    <div className="workspace-map-list">{setup?.workspaces.map((workspace) => <WorkspaceRow key={workspace.path} workspace={workspace} onSave={saveWorkspace} />) ?? <p>Loading local workspace map…</p>}</div>
    {message ? <p className="settings-message success" role="status">{message}</p> : null}
    <WorkGroupResetDialog busy={resettingWorkGroup} onClose={() => setResetDialogOpen(false)} onConfirm={() => void resetWorkGroup()} open={resetDialogOpen} />
  </section>;
}

function ProfileForm({ onSave, profile }: { onSave: (profile: DesktopProfile) => Promise<void>; profile: DesktopProfile }) {
  const [draft, setDraft] = useState(profile);
  useEffect(() => setDraft(profile), [profile]);
  return <div className="settings-grid identity-grid">
    <label className="setting-item">Display name<input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></label>
    <label className="setting-item">Email <span>Optional</span><input value={draft.email ?? ""} onChange={(event) => setDraft({ ...draft, email: event.target.value || null })} /></label>
    <label className="desktop-setup-check"><input checked={draft.rememberIdentity} onChange={(event) => setDraft({ ...draft, rememberIdentity: event.target.checked })} type="checkbox" /><span><strong>Remember local identity</strong><small>Restore the last workspace without asking.</small></span></label>
    <label className="desktop-setup-check"><input checked={draft.confirmOnStartup} disabled={!draft.rememberIdentity} onChange={(event) => setDraft({ ...draft, confirmOnStartup: event.target.checked })} type="checkbox" /><span><strong>Ask on every start</strong><small>Do not restore a workspace until confirmed.</small></span></label>
    <button className="settings-save-inline" disabled={!draft.displayName.trim()} onClick={() => void onSave(draft)} type="button"><Save size={15} /> Save identity</button>
  </div>;
}

function WorkspaceRow({ onSave, workspace }: { onSave: (workspace: DesktopWorkspace) => Promise<void>; workspace: DesktopWorkspace }) {
  const [draft, setDraft] = useState(workspace);
  return <article className="workspace-map-row"><div className="workspace-map-title"><UserRound size={16} /><div><strong>{workspace.name}</strong><small>{workspace.path}</small></div></div><label>Type<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as DesktopWorkspace["kind"] })}><option value="application">Application</option><option value="plugin">Plugin</option><option value="document">Document</option><option value="other">Other</option></select></label><label>Link<select value={draft.relationship} onChange={(event) => setDraft({ ...draft, relationship: event.target.value as DesktopWorkspace["relationship"] })}><option value="project">Project</option><option value="addOn">Add-on project</option><option value="standalone">Standalone</option></select></label><label>Project or add-on<input value={draft.projectName ?? ""} onChange={(event) => setDraft({ ...draft, projectName: event.target.value || null })} placeholder="Optional name" /></label><button onClick={() => void onSave(draft)} type="button">Save</button></article>;
}
