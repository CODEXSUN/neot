import { Box, CheckCircle2, CircleDashed, Cpu, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { PythonEnvironment, SystemStatus } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function RuntimePanel({ system }: { system: SystemStatus | undefined }) {
  const [python, setPython] = useState<PythonEnvironment>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();
  const runtimes = [
    ["Docker", system?.docker],
    ["Git", system?.git],
    ["Node.js", system?.node],
    ["Python / ML", system?.python],
    ["ripgrep search", system?.ripgrep],
    ["WSL2", system?.wsl]
  ] as const;

  useEffect(() => {
    void desktopClient
      .pythonEnvironmentStatus()
      .then(setPython)
      .catch(() => undefined);
  }, []);

  async function createEnvironment() {
    setCreating(true);
    try {
      setPython(await desktopClient.createPythonEnvironment());
      setError(undefined);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="runtime-panel">
      <div className="runtime-heading">
        <Box size={18} />
        <span>
          <strong>Local runtimes</strong>
          <small>Detected on this computer</small>
        </span>
      </div>
      {runtimes.map(([label, available]) => (
        <div className="runtime-row" key={label}>
          {available ? <CheckCircle2 size={15} /> : <CircleDashed size={15} />}
          <span>{label}</span>
          <small>{available ? "Ready" : "Not detected"}</small>
        </div>
      ))}
      <section className="python-environment">
        <header>
          <Cpu size={15} />
          <span>
            <strong>Project Python</strong>
            <small>{python?.version ?? "No interpreter detected"}</small>
          </span>
        </header>
        {python?.configured ? (
          <div className="python-ready">
            <CheckCircle2 size={14} /> Workspace .venv ready
          </div>
        ) : (
          <button
            disabled={!python?.available || creating}
            onClick={() => void createEnvironment()}
            type="button"
          >
            <Plus size={13} /> {creating ? "Creating..." : "Create .venv"}
          </button>
        )}
        <small>
          {python?.projectFiles.length
            ? python.projectFiles.join(" - ")
            : "No Python project file detected"}
        </small>
        <small>{python?.gpuTools ? "NVIDIA tools detected" : "CPU environment"}</small>
        {error ? <div className="panel-error">{error}</div> : null}
      </section>
      <p className="panel-note">
        Package installation remains explicit. NEOT does not download ML libraries automatically.
      </p>
    </div>
  );
}
