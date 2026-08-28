import { ArrowLeft, CalendarDays, Database, FileText, FolderGit2, GitBranch, Lightbulb, Link2, Pin, Save, Settings2, Star, UserRound, X } from "lucide-react";
import { useState } from "react";
import type { DesktopWorkspace } from "../contracts/desktop";

export function ProjectDetails({ defaultProjectPath, onOpenChangelog, onOpenGitStatus, onOpenIdeas, onReturn, onSaveDetails, onToggleDefault, workspace }: {
  defaultProjectPath: string | null | undefined;
  onOpenChangelog: () => void;
  onOpenGitStatus: () => void;
  onOpenIdeas: () => void;
  onReturn: () => void;
  onSaveDetails: (workspace: DesktopWorkspace) => Promise<void>;
  onToggleDefault: (path: string, isDefault: boolean) => Promise<void>;
  workspace: DesktopWorkspace;
}) {
  const isDefault = workspace.path === defaultProjectPath;
  const [editorOpen, setEditorOpen] = useState(false);
  const [savingDefault, setSavingDefault] = useState(false);

  async function toggleDefault() {
    setSavingDefault(true);
    try { await onToggleDefault(workspace.path, isDefault); } finally { setSavingDefault(false); }
  }

  return <section className="project-details">
    <button className="project-details-back" onClick={onReturn} type="button"><ArrowLeft size={16} /> Return to projects</button>
    <header className="project-details-header">
      <div><p>Project details</p><h1>{workspace.projectName?.trim() || workspace.name}</h1><span>{workspace.tagline?.trim() || projectTagline(workspace)}</span></div>
      <div className="project-details-status">
        <button className="project-details-settings" onClick={() => setEditorOpen(true)} type="button"><Settings2 size={15} /> Edit project</button>
        <span><Link2 size={14} /> Connected</span>
        <button aria-pressed={isDefault} className="project-default-toggle" disabled={savingDefault} onClick={() => void toggleDefault()} title={isDefault ? "Clear default project" : "Set as default project"} type="button"><Star size={14} /> {isDefault ? "Default project" : "Set as default"}</button>
      </div>
    </header>
    <ProjectMetadataTable workspace={workspace} />
    <section className="project-details-links" aria-label="Project tools">
      <button onClick={onOpenGitStatus} type="button"><GitBranch size={16} /><span><strong>Git status</strong><small>Inspect branch, version, latest commit, and changed files.</small></span></button>
      <button onClick={onOpenChangelog} type="button"><FileText size={16} /><span><strong>Changelog</strong><small>Open the registered project&apos;s Markdown preview.</small></span></button>
      <button onClick={onOpenIdeas} type="button"><Lightbulb size={16} /><span><strong>Ideas</strong><small>Shape a direction before converting it to a project task.</small></span></button>
    </section>
    {editorOpen ? <ProjectDetailsEditor onClose={() => setEditorOpen(false)} onSave={onSaveDetails} workspace={workspace} /> : null}
  </section>;
}

function ProjectDetailsEditor({ onClose, onSave, workspace }: { onClose: () => void; onSave: (workspace: DesktopWorkspace) => Promise<void>; workspace: DesktopWorkspace }) {
  const [form, setForm] = useState(workspace);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function save() {
    setSaving(true);
    setError(undefined);
    try {
      await onSave({ ...form, dueOn: optional(form.dueOn), ownerName: optional(form.ownerName), projectType: optional(form.projectType), startedOn: optional(form.startedOn), tagline: optional(form.tagline) });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally { setSaving(false); }
  }

  return <div className="project-details-editor-layer">
    <button aria-label="Close project details editor" className="project-details-editor-backdrop" disabled={saving} onClick={onClose} type="button" />
    <form aria-modal="true" className="project-details-editor" onSubmit={(event) => { event.preventDefault(); void save(); }} role="dialog">
      <header><div><span><Settings2 size={16} /></span><div><h2>Edit project details</h2><p>Updates are saved only to this NEOT project record.</p></div></div><button aria-label="Close project details editor" disabled={saving} onClick={onClose} type="button"><X size={17} /></button></header>
      <div className="project-details-editor-fields">
        <label>Project ID<input disabled readOnly title="Assigned automatically when the project is registered" type="number" value={form.projectId ?? ""} /></label>
        <label>Owner<input maxLength={120} onChange={(event) => setForm({ ...form, ownerName: event.target.value })} placeholder="Project owner" value={form.ownerName ?? ""} /></label>
        <label className="wide">Tagline<textarea maxLength={280} onChange={(event) => setForm({ ...form, tagline: event.target.value })} placeholder="A short description of this project" rows={3} value={form.tagline ?? ""} /></label>
        <label>Project type<input maxLength={80} onChange={(event) => setForm({ ...form, projectType: event.target.value })} placeholder={projectKindLabel(workspace)} value={form.projectType ?? ""} /></label>
        <label>Priority<select onChange={(event) => setForm({ ...form, priority: event.target.value as DesktopWorkspace["priority"] })} value={form.priority}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
        <label>Started on<input onChange={(event) => setForm({ ...form, startedOn: event.target.value })} type="date" value={form.startedOn ?? ""} /></label>
        <label>Due date<input onChange={(event) => setForm({ ...form, dueOn: event.target.value })} type="date" value={form.dueOn ?? ""} /></label>
      </div>
      {error ? <p className="project-details-editor-error" role="alert">{error}</p> : null}
      <footer><button disabled={saving} onClick={onClose} type="button">Cancel</button><button className="primary" disabled={saving} type="submit"><Save size={16} /> {saving ? "Saving…" : "Save project details"}</button></footer>
    </form>
  </div>;
}

function ProjectMetadataTable({ workspace }: { workspace: DesktopWorkspace }) {
  const rows = [
    [FolderGit2, "Project type", workspace.projectType?.trim() || projectKindLabel(workspace)],
    [UserRound, "Owner", workspace.ownerName?.trim() || "Not assigned"],
    [CalendarDays, "Started", workspace.startedOn || "Not set"],
    [CalendarDays, "Due date", workspace.dueOn || "Not set"],
    [Star, "Priority", priorityLabel(workspace.priority)],
    [Database, "Project ID", workspace.projectId ? String(workspace.projectId) : "Not set"],
    [Link2, "Relationship", relationshipLabel(workspace.relationship)],
    [Database, "Saved path", workspace.path],
    [Pin, "Workspace state", workspace.pinned ? "Pinned" : "Connected"],
    [Database, "Last opened", workspace.lastOpenedAt || "Not opened yet"]
  ] as const;

  return <section className="project-metadata" aria-label="Project details">
    <table>
      <tbody>{rows.map(([Icon, label, value]) => <tr key={label}><th scope="row"><Icon size={15} /> {label}</th><td title={value}>{value}</td></tr>)}</tbody>
    </table>
  </section>;
}
function optional(value: string | null | undefined) { const trimmed = value?.trim(); return trimmed ? trimmed : null; }
function relationshipLabel(relationship: DesktopWorkspace["relationship"]) { if (relationship === "addOn") return "Add-on project"; if (relationship === "standalone") return "Standalone"; return "Project"; }
function projectKindLabel(workspace: DesktopWorkspace) { return workspace.kind === "plugin" ? "Plugin" : "Application"; }
function priorityLabel(priority: DesktopWorkspace["priority"]) { return priority.charAt(0).toUpperCase() + priority.slice(1); }
function projectTagline(workspace: DesktopWorkspace) { return `${workspace.projectName?.trim() || workspace.name} is a connected ${projectKindLabel(workspace).toLowerCase()} ${relationshipLabel(workspace.relationship).toLowerCase()} in this local workspace.`; }
