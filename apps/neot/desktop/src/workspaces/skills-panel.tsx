import { BookOpen, Bot, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProjectSkill } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { ProjectLearningPanel } from "./project-learning-panel";

export function SkillsPanel({ onOpen }: { onOpen: (path: string) => void }) {
  const [skills, setSkills] = useState<ProjectSkill[]>([]);
  function refresh() {
    void desktopClient.listProjectSkills().then(setSkills);
  }
  useEffect(refresh, []);
  return (
    <div className="skills-panel">
      <div className="agent-summary">
        <Bot size={19} />
        <span>
          <strong>Agent preparation</strong>
          <small>Project skills and reviewed facts</small>
        </span>
      </div>
      <div className="tree-section">
        Project skills{" "}
        <button aria-label="Refresh skills" onClick={refresh} type="button">
          <RefreshCw size={12} />
        </button>
      </div>
      {skills.map((skill) => (
        <button
          className="skill-row"
          key={skill.path}
          onClick={() => onOpen(skill.path)}
          type="button"
        >
          <BookOpen size={14} />
          <span>
            <strong>{skill.id}</strong>
            <small>{skill.source}</small>
          </span>
        </button>
      ))}
      {!skills.length ? (
        <p className="panel-note">
          Add project skills under <code>.neot/skills</code>.
        </p>
      ) : null}
      <ProjectLearningPanel />
    </div>
  );
}
