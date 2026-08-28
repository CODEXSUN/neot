import { ArrowLeft, FileText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { DesktopWorkspace, ProjectGitOverview } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

const taskChoices = ["github:now", "GitHub dry run", "GitHub release", "GitHub tag", "GitHub pull"];

export function ProjectGitStatus({ onReturn, onOpenTaskRunner, workspace }: { onReturn: () => void; onOpenTaskRunner: (task: string) => void; workspace: DesktopWorkspace }) {
  const [data, setData] = useState<ProjectGitOverview>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    try { setData(await desktopClient.getDesktopProjectGitOverview(workspace.path)); }
    catch (reason) { setData(undefined); setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { setLoading(false); }
  }, [workspace.path]);

  useEffect(() => { void load(); }, [load]);

  return <section className="project-git-status-page">
    <button className="project-details-back" onClick={onReturn} type="button"><ArrowLeft size={16} /> Return to project</button>
    <header className="project-git-status-header"><div><p>Git status</p><h1>{workspace.projectName?.trim() || workspace.name}</h1><span>Live local repository state. GitHub actions require a separate task run and approval.</span></div><button disabled={loading} onClick={() => void load()} type="button"><RefreshCw size={15} /> Refresh</button></header>
    <section className="project-git-task-actions" aria-label="Git task shortcuts"><span>Add task</span><div>{taskChoices.map((task) => <button key={task} onClick={() => onOpenTaskRunner(task)} type="button">{task}</button>)}</div></section>
    {loading ? <p className="project-changelog-loading">Loading Git status…</p> : null}
    {error ? <p className="project-git-error" role="alert">{error}</p> : null}
    {data ? <><div className="project-git-summary"><section><h2>Git status</h2><dl><dt>Branch</dt><dd>{data.branch || "Detached"}</dd><dt>Revision</dt><dd>{data.revision}</dd><dt>Changed files</dt><dd>{data.changedFiles.length}</dd></dl></section><section><h2>Version and latest commit</h2><dl><dt>Package version</dt><dd>{data.packageVersion ?? "Not found"}</dd><dt>Changelog</dt><dd>{data.changelogVersion ?? "Not found"}</dd><dt>Commit</dt><dd>{data.latestCommit}</dd><dt>Committed</dt><dd>{data.committedAt}</dd></dl></section></div><section className="project-git-files"><header><FileText size={16} /><h2>Changed files</h2></header>{data.changedFiles.length ? <ul>{data.changedFiles.map((file) => <li key={`${file.status}:${file.path}`}><span>{file.status}</span><code>{file.path}</code></li>)}</ul> : <p>Working tree is clean.</p>}</section></> : null}
  </section>;
}
