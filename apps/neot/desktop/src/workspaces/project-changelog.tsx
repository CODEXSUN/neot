import { ArrowLeft, FileText, FolderOpen, RefreshCw, Settings2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DesktopWorkspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { AgentMarkdown } from "./agent-markdown";

export function ProjectChangelog({ onReturn, onSaveDetails, workspace }: { onReturn: () => void; onSaveDetails: (workspace: DesktopWorkspace) => Promise<void>; workspace: DesktopWorkspace }) {
  const [content, setContent] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [changelogPath, setChangelogPath] = useState(workspace.changelogPath ?? "");
  const [choosingFile, setChoosingFile] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setContent(await desktopClient.readDesktopProjectChangelog(workspace.path, changelogPath || workspace.changelogPath || undefined));
    } catch (reason) {
      setContent(undefined);
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [workspace.path]);

  useEffect(() => { void load(); }, [load]);

  async function chooseFile() {
    setChoosingFile(true);
    try {
      const selected = await desktopClient.chooseDesktopProjectChangelog(workspace.path);
      if (selected) setChangelogPath(selected);
    } finally { setChoosingFile(false); }
  }

  const projectName = workspace.projectName?.trim() || workspace.name;

  return <section className="project-changelog">
    <button className="project-details-back" onClick={onReturn} type="button"><ArrowLeft size={16} /> Return to project</button>
    <header className="project-changelog-header">
      <div>
        <p>Project changelog</p>
        <h1>{projectName}</h1>
        <span>Local preview of this registered project&apos;s changelog.</span>
      </div>
      <div className="project-changelog-actions"><button aria-label="Choose changelog file" onClick={() => setSettingsOpen(true)} type="button"><Settings2 size={15} /> Settings</button><button disabled={loading} onClick={() => void load()} type="button"><RefreshCw size={15} /> Refresh</button></div>
    </header>
    <button className="project-changelog-location" onClick={() => setSettingsOpen(true)} type="button"><FileText size={16} /><span><small>Changelog location</small><strong>{changelogPath || "assist/documentation/changelog.md (default)"}</strong></span><Settings2 size={15} /></button>
    {loading ? <p className="project-changelog-loading">Loading changelog…</p> : null}
    {error ? <section className="project-changelog-empty" role="status"><FileText size={20} /><div><h2>Changelog unavailable</h2><p>{error}</p></div></section> : null}
    {!loading && !error && content ? <article className="project-changelog-preview"><AgentMarkdown text={content} /></article> : null}
    {settingsOpen ? <div className="project-details-editor-layer project-changelog-settings-layer"><button aria-label="Close changelog settings" className="project-details-editor-backdrop" disabled={choosingFile} onClick={() => setSettingsOpen(false)} type="button" /><form aria-modal="true" className="project-changelog-settings" onSubmit={(event) => { event.preventDefault(); void onSaveDetails({ ...workspace, changelogPath: changelogPath || null }).then(() => { setSettingsOpen(false); void load(); }); }} role="dialog"><header><div><span><FileText size={16} /></span><div><h2>Changelog location</h2><p>Select a Markdown or MDX file inside this project.</p></div></div><button aria-label="Close changelog settings" disabled={choosingFile} onClick={() => setSettingsOpen(false)} type="button"><X size={17} /></button></header><label>Selected changelog<output>{changelogPath || "assist/documentation/changelog.md (default)"}</output></label><button className="project-changelog-file-picker" disabled={choosingFile} onClick={() => void chooseFile()} type="button"><FolderOpen size={16} /> {choosingFile ? "Opening file picker…" : "Choose changelog file"}</button><small>The default is assist/documentation/changelog.md. Select a file to override it for this project.</small><footer><button disabled={choosingFile} onClick={() => setSettingsOpen(false)} type="button">Cancel</button><button className="primary" disabled={choosingFile} type="submit">Use location</button></footer></form></div> : null}
  </section>;
}
