import {
  BrainCircuit,
  Check,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ProjectLearning,
  ProjectLearningSettings,
  ProjectLearningSummary
} from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function ProjectLearningPanel() {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectLearningSummary>();

  useEffect(() => {
    let active = true;
    void desktopClient
      .projectLearningSummary()
      .then((saved) =>
        saved.settings.autoScan ? desktopClient.scanProjectLearning() : saved
      )
      .then((next) => active && setSummary(next))
      .catch((reason) => active && setError(String(reason)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function scan() {
    setLoading(true);
    setError(undefined);
    try {
      setSummary(await desktopClient.scanProjectLearning());
    } catch (reason) {
      setError(String(reason));
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(settings: ProjectLearningSettings) {
    setError(undefined);
    try {
      const saved = await desktopClient.saveProjectLearningSettings(
        settings.enabled,
        settings.autoScan
      );
      setSummary((current) => (current ? { ...current, settings: saved } : current));
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function review(item: ProjectLearning, status: "approved" | "rejected") {
    setError(undefined);
    try {
      const saved = await desktopClient.reviewProjectLearning(item.id, status);
      setSummary((current) => replaceLearning(current, saved));
    } catch (reason) {
      setError(String(reason));
    }
  }

  const visibleItems = summary?.items ?? [];
  return (
    <section className="learning-panel">
      <header>
        <span>
          <BrainCircuit size={15} />
          <strong>Project learning</strong>
        </span>
        <button aria-label="Scan project knowledge" disabled={loading} onClick={scan} type="button">
          <RefreshCw className={loading ? "spin" : undefined} size={13} />
        </button>
      </header>
      <p>NEOT proposes facts from repository evidence. Only approved facts guide the agent.</p>
      {summary ? (
        <div className="learning-settings">
          <LearningOption
            checked={summary.settings.enabled}
            label="Use approved facts"
            onChange={(enabled) => saveSettings({ ...summary.settings, enabled })}
          />
          <LearningOption
            checked={summary.settings.autoScan}
            label="Recheck after agent work"
            onChange={(autoScan) => saveSettings({ ...summary.settings, autoScan })}
          />
        </div>
      ) : null}
      {summary ? (
        <div className="learning-counts">
          <span><Check size={11} /> {summary.approvedCount} approved</span>
          <span>{summary.candidateCount} to review</span>
          {summary.staleCount ? <span>{summary.staleCount} stale</span> : null}
        </div>
      ) : null}
      {error ? <div className="panel-error">{error}</div> : null}
      <div className="learning-items">
        {visibleItems.map((item) => (
          <LearningRow item={item} key={item.id} onReview={review} />
        ))}
      </div>
      {!loading && summary && !visibleItems.length ? (
        <p className="panel-note">No project facts were detected.</p>
      ) : null}
    </section>
  );
}

function LearningOption({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      {label}
    </label>
  );
}

function LearningRow({
  item,
  onReview
}: {
  item: ProjectLearning;
  onReview: (item: ProjectLearning, status: "approved" | "rejected") => void;
}) {
  return (
    <article className={`learning-row ${item.status}`}>
      <header>
        <span>{statusIcon(item.status)} {item.category}</span>
        <small>{item.status}</small>
      </header>
      <strong>{item.title}</strong>
      <p>{item.content}</p>
      {item.evidencePath ? <code>{item.evidencePath}</code> : null}
      {item.status === "candidate" ? (
        <footer>
          <button onClick={() => onReview(item, "rejected")} type="button"><X size={12} /> Reject</button>
          <button className="approve" onClick={() => onReview(item, "approved")} type="button">
            <Check size={12} /> Approve
          </button>
        </footer>
      ) : null}
      {item.status === "rejected" ? (
        <footer>
          <button className="approve" onClick={() => onReview(item, "approved")} type="button">
            <Check size={12} /> Approve instead
          </button>
        </footer>
      ) : null}
    </article>
  );
}

function statusIcon(status: ProjectLearning["status"]) {
  if (status === "approved") return <ShieldCheck size={12} />;
  if (status === "stale") return <TriangleAlert size={12} />;
  if (status === "rejected") return <X size={12} />;
  return <BrainCircuit size={12} />;
}

function replaceLearning(
  summary: ProjectLearningSummary | undefined,
  item: ProjectLearning
) {
  if (!summary) return summary;
  const items = summary.items.map((entry) => (entry.id === item.id ? item : entry));
  return {
    ...summary,
    approvedCount: countStatus(items, "approved"),
    candidateCount: countStatus(items, "candidate"),
    staleCount: countStatus(items, "stale"),
    items
  };
}

function countStatus(items: ProjectLearning[], status: ProjectLearning["status"]) {
  return items.filter((item) => item.status === status).length;
}
