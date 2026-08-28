import { useEffect, useState } from "react";
import type { AgentConfig, AgentProvider, AgentReasoningEffort } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { TaskRunnerPanel } from "./task-runner-panel";

export function TaskRunnerWorkspace({ initialTaskId, onRefreshChanges }: { initialTaskId?: number; onRefreshChanges: () => Promise<void> }) {
  const [connection, setConnection] = useState({ effort: "low" as AgentReasoningEffort, id: "codex" as AgentProvider, model: "gpt-5.6-terra", provider: "Codex" });
  useEffect(() => { void desktopClient.getAgentConfig().then((config) => setConnection(fromConfig(config))); }, []);
  async function update(provider: AgentProvider, model: string) {
    const config = await desktopClient.getAgentConfig();
    const providers = Object.fromEntries(Object.entries(config.providers).map(([key, item]) => [key, { ...item, isDefault: key === provider }])) as AgentConfig["providers"];
    const saved = await desktopClient.saveAgentConfig({ ...config, defaultProvider: provider, providers: { ...providers, [provider]: { ...providers[provider], enabled: true, isDefault: true, model, reasoningEffort: connection.effort } } });
    setConnection(fromConfig(saved));
  }
  return <TaskRunnerPanel connection={connection} {...(initialTaskId ? { initialTaskId } : {})} onPreferenceChange={update} onRefreshChanges={onRefreshChanges} />;
}

function fromConfig(config: AgentConfig) {
  const id = config.defaultProvider;
  const provider = config.providers[id];
  return { effort: provider.reasoningEffort ?? "low", id, model: provider.model === "gpt-5.6-sol" ? "gpt-5.6-terra" : provider.model ?? "gpt-5.6-terra", provider: id === "codex" ? "Codex" : id };
}
