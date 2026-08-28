import { ArrowRight, FolderCog, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { desktopClient } from "../services/desktop-client";

export function ProjectSummary({
  activeProjectCount,
  addOnProjectCount,
  displayName,
  onOpenProjects,
  onWorkspaceFolderChanged,
  workspaceFolder
}: {
  activeProjectCount: number;
  addOnProjectCount: number;
  displayName: string | null | undefined;
  onOpenProjects: () => void;
  onWorkspaceFolderChanged: () => Promise<unknown>;
  workspaceFolder: string | null | undefined;
}) {
  const dailyQuote = quoteForToday(new Date());
  const name = displayName?.trim() || "there";
  const folder = workspaceFolder?.trim() || "No workspace folder configured";
  const [selectingFolder, setSelectingFolder] = useState(false);

  async function selectWorkspaceFolder() {
    setSelectingFolder(true);
    try {
      await desktopClient.chooseWorkGroup();
      await onWorkspaceFolderChanged();
    } catch (reason) {
      if (!String(reason).toLowerCase().includes("canceled")) console.error("Workspace folder selection failed", reason);
    } finally {
      setSelectingFolder(false);
    }
  }

  return <section className="project-summary">
    <header className="project-summary-intro">
      <div className="project-summary-welcome"><span>Welcome</span><h1>{greetingForTime(new Date())}, {name}</h1><p>“{dailyQuote}”</p></div>
      <aside className="project-summary-connection"><span className="project-summary-connection-status">Connected locally</span><button className="project-summary-folder-card" disabled={selectingFolder} onClick={() => void selectWorkspaceFolder()} title="Change workspace folder" type="button"><FolderCog size={16} /><span><small>Workspace folder</small><strong title={folder}>{folder}</strong></span>{selectingFolder ? <LoaderCircle className="project-summary-folder-spinner" size={15} /> : null}</button></aside>
    </header>
    <section className="project-summary-status-row" aria-label="Workspace summary">
      <button onClick={onOpenProjects} type="button"><strong>{activeProjectCount}</strong><span>Active projects <ArrowRight size={14} /></span></button>
      <button onClick={onOpenProjects} type="button"><strong>{addOnProjectCount}</strong><span>Add-on projects <ArrowRight size={14} /></span></button>
    </section>
  </section>;
}

function quoteForToday(today: Date) {
  const quotes = [
    "Make the next change clear, small, and verifiable.",
    "A calm plan makes difficult work manageable.",
    "Evidence is more useful than a confident guess.",
    "Finish one meaningful path before opening another.",
    "Good engineering makes the next decision easier.",
    "Keep the context small and the outcome observable.",
    "Reliable progress starts with an honest current state."
  ];
  const day = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000);
  return quotes[day % quotes.length] ?? quotes[0];
}

function greetingForTime(now: Date) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
