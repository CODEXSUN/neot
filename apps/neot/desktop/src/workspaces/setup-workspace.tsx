import {
  Blocks,
  Bot,
  FolderOpen,
  GitBranch,
  HardDrive,
  LoaderCircle,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";
import type { SystemStatus } from "../contracts/desktop";
import type { AgentRuntimeState } from "../shell/use-desktop-session";

export function SetupWorkspace({
  agentRuntimeState,
  error,
  onOpen,
  opening,
  system
}: {
  agentRuntimeState: AgentRuntimeState;
  error: string | undefined;
  onOpen: (path?: string) => Promise<void>;
  opening: boolean;
  system: SystemStatus | undefined;
}) {
  return (
    <main className="setup">
      <section className="setup-copy">
        <div className="setup-mark">
          <Blocks size={25} />
        </div>
        <p className="eyebrow">NEOT</p>
        <h1>Your engineering workspace, on this machine.</h1>
        <p>
          Open a repository to use the coding agent, files, Git, terminals, Docker, and local execution
          from one IDE.
        </p>
        <button disabled={opening} onClick={() => void onOpen()} type="button">
          {opening ? <LoaderCircle className="setup-spinner" size={17} /> : <FolderOpen size={17} />}
          {opening ? "Opening workspace" : "Open workspace"}
        </button>
        {error ? <div className="setup-error">{error}</div> : null}
      </section>
      <aside className="setup-status">
        <h2>Local runtime</h2>
        <Status
          icon={Bot}
          label="Coding agent"
          value={runtimeLabel(agentRuntimeState)}
        />
        <Status icon={GitBranch} label="Git" value={system?.git ? "Ready" : "Loads with workspace"} />
        <Status icon={HardDrive} label="Local SQLite" value="Loads with chat history" />
        <Status icon={ShieldCheck} label="Execution policy" value="Workspace scoped" />
      </aside>
    </main>
  );
}

function Status({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="setup-status-row">
      <Icon size={17} />
      <span>
        <strong>{label}</strong>
        <small>{value}</small>
      </span>
    </div>
  );
}

function runtimeLabel(state: AgentRuntimeState) {
  if (state === "idle") return "Starts with your first prompt";
  if (state === "ready") return "Ready";
  if (state === "unavailable") return "Needs attention";
  return "Starting";
}
