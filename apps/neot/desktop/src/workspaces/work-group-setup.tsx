import { ArrowLeft, ChevronDown, FolderOpen, GitBranch, Link2, LoaderCircle, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  DesktopProfile,
  DesktopWorkspace,
  RepositoryCandidate,
  WorkspaceKind,
  WorkspaceRelationship,
  WorkGroupScan
} from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { WorkGroupResetDialog } from "./work-group-reset-dialog";

type RepositoryType = "project" | "addOn" | "plugin" | "application";

export function WorkGroupSetup({
  onOpenWorkspace,
  onRefresh,
  onReturn,
  profile
}: {
  onOpenWorkspace: (path?: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onReturn?: (() => void) | undefined;
  profile: DesktopProfile;
}) {
  const [scan, setScan] = useState<WorkGroupScan>();
  const [busyPath, setBusyPath] = useState<string>();
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const didPromptForFolder = useRef(false);

  useEffect(() => {
    if (!profile.defaultWorkGroupPath) return;
    void loadSavedGroup();
  }, [profile.defaultWorkGroupPath]);

  useEffect(() => {
    if (profile.defaultWorkGroupPath || didPromptForFolder.current) return;
    didPromptForFolder.current = true;
    void chooseGroup();
  }, [profile.defaultWorkGroupPath]);

  async function loadSavedGroup() {
    setScanning(true);
    setError(undefined);
    try {
      setScan(await desktopClient.scanWorkGroup());
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setScanning(false);
    }
  }

  async function chooseGroup() {
    setScanning(true);
    setError(undefined);
    try {
      setScan(await desktopClient.chooseWorkGroup());
      await onRefresh();
    } catch (reason) {
      const message = errorMessage(reason);
      if (!message.includes("canceled")) setError(message);
    } finally {
      setScanning(false);
    }
  }

  async function resetGroup() {
    setResetDialogOpen(false);
    setScanning(true);
    setError(undefined);
    try {
      await desktopClient.resetDesktopWorkGroup();
      setScan(undefined);
      await onRefresh();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setScanning(false);
    }
  }

  async function connect(candidate: RepositoryCandidate, repositoryType: RepositoryType, openAfterSave: boolean) {
    setBusyPath(candidate.path);
    setError(undefined);
    try {
      await desktopClient.saveDesktopWorkspace(toDesktopWorkspace(candidate, repositoryType));
      await onRefresh();
      setScan(await desktopClient.scanWorkGroup(scan?.group.path));
      if (openAfterSave) await onOpenWorkspace(candidate.path);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusyPath(undefined);
    }
  }

  return (
    <main className="desktop-setup work-group-setup">
      <section className="work-group-results" aria-live="polite">
        <header className="work-group-page-header">
          <div><p>Local workspace</p><h1>Folder &amp; repositories</h1><span>Manage the repositories found in this work group.</span></div>
          <button className="work-group-outline-button" disabled={scanning || !profile.defaultWorkGroupPath} onClick={() => void loadSavedGroup()} type="button">
            <RefreshCw className={scanning ? "setup-spinner" : undefined} size={16} /> Reload folders
          </button>
        </header>
        <div className="work-group-toolbar">
          {onReturn ? <button className="work-group-back-button" onClick={onReturn} type="button"><ArrowLeft size={16} /> Return to workspace</button> : null}
          <div>
            <button className="work-group-outline-button" disabled={scanning} onClick={() => void chooseGroup()} type="button">
              {scanning ? <LoaderCircle className="setup-spinner" size={16} /> : <FolderOpen size={16} />}
              {scan ? "Change work group" : "Choose work group"}
            </button>
            {scan || profile.defaultWorkGroupPath ? <button className="work-group-outline-button" disabled={scanning} onClick={() => setResetDialogOpen(true)} type="button"><RotateCcw size={16} /> Reset</button> : null}
          </div>
        </div>
        {scanning ? <p className="work-group-empty">Checking folders for Git repositories…</p> : null}
        {!scanning && !scan ? <p className="work-group-empty">No work group is configured yet.</p> : null}
        {scan ? <RepositoryList busyPath={busyPath} onConnect={connect} scan={scan} /> : null}
        {error ? <p className="setup-error" role="alert">{error}</p> : null}
      </section>
      <WorkGroupResetDialog busy={scanning} onClose={() => setResetDialogOpen(false)} onConfirm={() => void resetGroup()} open={resetDialogOpen} />
    </main>
  );
}

function RepositoryList({
  busyPath,
  onConnect,
  scan
}: {
  busyPath: string | undefined;
  onConnect: (candidate: RepositoryCandidate, repositoryType: RepositoryType, openAfterSave: boolean) => Promise<void>;
  scan: WorkGroupScan;
}) {
  return (
    <>
      <div className="work-group-heading">
        <div><h2>{scan.group.name}</h2><p>{scan.group.path}</p></div>
        <span>{scan.repositories.length} repositories</span>
      </div>
      {scan.repositories.length === 0 ? <p className="work-group-empty">No Git repository was found directly inside this work group.</p> : null}
      <div className="repository-candidate-list">
        {scan.repositories.map((candidate) => (
          <RepositoryCandidateRow
            busy={busyPath === candidate.path}
            candidate={candidate}
            key={candidate.path}
            onConnect={onConnect}
          />
        ))}
      </div>
    </>
  );
}

function RepositoryCandidateRow({
  busy,
  candidate,
  onConnect
}: {
  busy: boolean;
  candidate: RepositoryCandidate;
  onConnect: (candidate: RepositoryCandidate, repositoryType: RepositoryType, openAfterSave: boolean) => Promise<void>;
}) {
  const [repositoryType, setRepositoryType] = useState<RepositoryType>(() => repositoryTypeFor(candidate));
  return (
    <article className="repository-candidate">
      <div className="repository-candidate-main">
        <GitBranch size={17} />
        <div><strong>{candidate.name}</strong><small>{candidate.path}</small></div>
      </div>
      <label className="repository-type-select">
        Type
        <select onChange={(event) => setRepositoryType(event.target.value as RepositoryType)} value={repositoryType}>
          <RepositoryTypeOptions />
        </select>
        <ChevronDown aria-hidden="true" size={14} />
      </label>
      {candidate.connected ? <span className="repository-connected">Connected</span> : <span className="repository-detected">Repository found</span>}
      <div className="repository-actions">
        <button className="repository-connect-button" disabled={busy || candidate.connected} onClick={() => void onConnect(candidate, repositoryType, true)} type="button">
          <Link2 size={14} /> Connect
        </button>
        <button className="repository-open-button" disabled={busy} onClick={() => void onConnect(candidate, repositoryType, true)} type="button">
          {busy ? "Opening…" : "Open"}
        </button>
      </div>
    </article>
  );
}

function RepositoryTypeOptions() {
  return <>
    <option value="project">Project</option>
    <option value="addOn">Add-on project</option>
    <option value="plugin">Plugin</option>
    <option value="application">Application</option>
  </>;
}

function repositoryTypeFor(candidate: RepositoryCandidate): RepositoryType {
  if (candidate.relationship === "project") return "project";
  if (candidate.relationship === "addOn") return "addOn";
  return candidate.kind === "plugin" ? "plugin" : "application";
}

function toDesktopWorkspace(candidate: RepositoryCandidate, repositoryType: RepositoryType): DesktopWorkspace {
  const mapping = repositoryMapping(repositoryType);
  return {
    kind: mapping.kind,
    lastOpenedAt: "",
    name: candidate.name,
    path: candidate.path,
    pinned: false,
    projectName: candidate.projectName ?? candidate.name,
    priority: "normal",
    relationship: mapping.relationship
  };
}

function repositoryMapping(repositoryType: RepositoryType): { kind: WorkspaceKind; relationship: WorkspaceRelationship } {
  if (repositoryType === "project") return { kind: "application", relationship: "project" };
  if (repositoryType === "addOn") return { kind: "plugin", relationship: "addOn" };
  if (repositoryType === "plugin") return { kind: "plugin", relationship: "standalone" };
  return { kind: "application", relationship: "standalone" };
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : String(reason);
}
