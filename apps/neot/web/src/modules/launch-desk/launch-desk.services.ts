import { apiGet, apiPost, apiPut } from "../../shared/api/neot-api";
import type {
  CodexStatus,
  CodexConnectionId,
  CodexConnectionStatus,
  BrowserLogin,
  DeviceLogin,
  LaunchDeskInput,
  LaunchDeskStreamEvent,
  ModelProviderId,
  ModelProviderStatus
} from "./launch-desk.types";

export const getCodexStatus = () => apiGet<CodexStatus>("/orchestration/codex/status");
export const getCodexConnections = () =>
  apiGet<CodexConnectionStatus[]>("/orchestration/codex/connections");
export const startCodexDeviceLogin = (connectionId: CodexConnectionId) =>
  apiPost<DeviceLogin>("/orchestration/codex/device-login", { connectionId });
export const startCodexBrowserLogin = (connectionId: CodexConnectionId) =>
  apiPost<BrowserLogin>("/orchestration/codex/browser-login", { connectionId });
export const loginCodexApiKey = (connectionId: CodexConnectionId, apiKey: string) =>
  apiPost<CodexStatus>("/orchestration/codex/api-key-login", { apiKey, connectionId });
export const cancelCodexLogin = (connectionId: CodexConnectionId, loginId: string) =>
  apiPost<{ cancelled: true }>("/orchestration/codex/login-cancel", {
    connectionId,
    loginId
  });
export const logoutCodex = (connectionId: CodexConnectionId) =>
  apiPost<{ disconnected: true }>("/orchestration/codex/logout", { connectionId });

export const getModelProviders = () =>
  apiGet<ModelProviderStatus[]>("/orchestration/model-providers");

export const saveModelProvider = (input: {
  apiKey?: string;
  baseUrl: string;
  label: string;
  model: string;
  provider: ModelProviderId;
}) => apiPut<ModelProviderStatus>(`/orchestration/model-providers/${input.provider}`, input);

export const testModelProvider = (provider: ModelProviderId) =>
  apiPost<ModelProviderStatus>(`/orchestration/model-providers/${provider}/test`);

export const disconnectModelProvider = (provider: ModelProviderId) =>
  apiPost<{ disconnected: true; provider: ModelProviderId }>(
    `/orchestration/model-providers/${provider}/disconnect`
  );

export async function streamLaunchPlan(
  input: LaunchDeskInput,
  onEvent: (event: LaunchDeskStreamEvent) => void,
  signal?: AbortSignal
) {
  const baseUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");
  const token = window.localStorage.getItem("neot_session");
  const response = await fetch(`${baseUrl}/api/neot/orchestration/launch-desk/stream`, {
    method: "POST",
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(signal ? { signal } : {})
  });
  if (!response.ok || !response.body) {
    const body = await response.text();
    throw new Error(body || `Launch Desk request failed (${response.status}).`);
  }
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as LaunchDeskStreamEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as LaunchDeskStreamEvent);
}
