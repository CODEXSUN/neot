import { Button } from "@neot/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RadioTowerIcon, SlidersHorizontalIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CodexConnection } from "./codex-connection";
import { ModelProviderConnection } from "./model-provider-connection";
import {
  cancelCodexLogin,
  disconnectModelProvider,
  getCodexConnections,
  getModelProviders,
  loginCodexApiKey,
  logoutCodex,
  saveModelProvider,
  startCodexBrowserLogin,
  startCodexDeviceLogin,
  testModelProvider
} from "./launch-desk.services";
import type {
  BrowserLogin,
  CodexConnectionId,
  CodexConnectionStatus,
  DeviceLogin
} from "./launch-desk.types";

type LoginState<T> = Partial<Record<CodexConnectionId, T>>;

export function LaunchDeskWorkspace() {
  const queryClient = useQueryClient();
  const [compact, setCompact] = useState(false);
  const [deviceLogins, setDeviceLogins] = useState<LoginState<DeviceLogin>>({});
  const [browserLogins, setBrowserLogins] = useState<LoginState<BrowserLogin>>({});
  const loginPending =
    Object.keys(deviceLogins).length > 0 || Object.keys(browserLogins).length > 0;
  const connections = useQuery({
    queryFn: getCodexConnections,
    queryKey: ["neot", "codex", "connections"],
    refetchInterval: loginPending ? 2_000 : 30_000
  });
  const providers = useQuery({
    queryFn: getModelProviders,
    queryKey: ["neot", "model-providers"]
  });

  useEffect(() => {
    for (const status of connections.data ?? []) {
      if (!status.connected) continue;
      setDeviceLogins((current) => omit(current, status.id));
      setBrowserLogins((current) => omit(current, status.id));
    }
  }, [connections.data]);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["neot", "codex", "connections"] });
  const device = useMutation({
    mutationFn: startCodexDeviceLogin,
    onSuccess: (login, id) => setDeviceLogins((current) => ({ ...current, [id]: login })),
    onError: (error) => toast.error(error.message)
  });
  const browser = useMutation({
    mutationFn: startCodexBrowserLogin,
    onSuccess: (login, id) => setBrowserLogins((current) => ({ ...current, [id]: login })),
    onError: (error) => toast.error(error.message)
  });
  const apiKey = useMutation({
    mutationFn: ({ id, key }: { id: CodexConnectionId; key: string }) => loginCodexApiKey(id, key),
    onSuccess: () => {
      toast.success("Codex API key connected.");
      void refresh();
    },
    onError: (error) => toast.error(error.message)
  });
  const disconnect = useMutation({
    mutationFn: logoutCodex,
    onSuccess: () => void refresh(),
    onError: (error) => toast.error(error.message)
  });
  const cancel = useMutation({
    mutationFn: ({ id, loginId }: { id: CodexConnectionId; loginId: string }) =>
      cancelCodexLogin(id, loginId),
    onSuccess: (_, input) => {
      setBrowserLogins((current) => omit(current, input.id));
      setDeviceLogins((current) => omit(current, input.id));
    },
    onError: (error) => toast.error(error.message)
  });
  const refreshProviders = () =>
    queryClient.invalidateQueries({ queryKey: ["neot", "model-providers"] });
  const saveProvider = useMutation({
    mutationFn: saveModelProvider,
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Model provider saved securely.");
      void refreshProviders();
    }
  });
  const testProvider = useMutation({
    mutationFn: testModelProvider,
    onError: (error) => {
      toast.error(error.message);
      void refreshProviders();
    },
    onSuccess: (status) => {
      toast.success(`${status.label} connection verified.`);
      void refreshProviders();
    }
  });
  const disconnectProvider = useMutation({
    mutationFn: disconnectModelProvider,
    onError: (error) => toast.error(error.message),
    onSuccess: () => void refreshProviders()
  });

  const openBrowserLogin = (id: CodexConnectionId) => {
    const loginWindow = window.open("about:blank", "_blank");
    browser.mutate(id, {
      onSuccess: (login) => {
        if (loginWindow) loginWindow.location.href = login.authUrl;
        else window.location.href = login.authUrl;
      },
      onError: () => loginWindow?.close()
    });
  };

  return (
    <main className="relative flex h-[calc(100dvh-3.5rem)] min-h-[36rem] flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <RadioTowerIcon className="size-4" />
        </span>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Agent Connector</h1>
          <p className="text-sm text-muted-foreground">
            Native Codex plus provider-neutral OpenCode connections
          </p>
        </div>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto">
        {resolvedStatuses(connections.data).map((status) => (
          <CodexConnection
            browserLogin={browserLogins[status.id] ?? null}
            compact={compact}
            deviceLogin={deviceLogins[status.id] ?? null}
            key={status.id}
            onApiKeyConnect={(key) => apiKey.mutate({ id: status.id, key })}
            onBrowserConnect={() => openBrowserLogin(status.id)}
            onCancelLogin={() => {
              const login = browserLogins[status.id] ?? deviceLogins[status.id];
              if (login) cancel.mutate({ id: status.id, loginId: login.loginId });
            }}
            onDeviceConnect={() => device.mutate(status.id)}
            onDisconnect={() => disconnect.mutate(status.id)}
            pending={
              device.isPending || browser.isPending || apiKey.isPending || disconnect.isPending
            }
            status={status}
          />
        ))}
        <div className="border-b bg-muted/20 px-6 py-3">
          <h2 className="text-sm font-semibold">Model providers</h2>
          <p className="pt-0.5 text-xs text-muted-foreground">
            OpenAI is the default. Other providers run through an isolated OpenCode coding bridge.
          </p>
        </div>
        {(providers.data ?? []).map((status) => (
          <ModelProviderConnection
            key={status.provider}
            onDisconnect={() => disconnectProvider.mutate(status.provider)}
            onSave={(input) => saveProvider.mutate({ ...input, provider: status.provider })}
            onTest={() => testProvider.mutate(status.provider)}
            pending={
              saveProvider.isPending || testProvider.isPending || disconnectProvider.isPending
            }
            status={status}
          />
        ))}
        <div className="grid gap-2 px-6 py-5 text-sm leading-6 text-muted-foreground">
          <p>Primary remains the default for existing chats and integrations.</p>
          <p>
            Parallel delegates rotate across connected slots and keep separate credential homes and
            worktrees.
          </p>
        </div>
      </section>
      <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
        <SlidersHorizontalIcon className="mx-2 size-4 text-muted-foreground" />
        <Button
          onClick={() => setCompact(true)}
          size="sm"
          variant={compact ? "secondary" : "ghost"}
        >
          Compact
        </Button>
        <Button
          onClick={() => setCompact(false)}
          size="sm"
          variant={!compact ? "secondary" : "ghost"}
        >
          Relaxed
        </Button>
      </div>
    </main>
  );
}

function resolvedStatuses(statuses?: CodexConnectionStatus[]): CodexConnectionStatus[] {
  if (statuses?.length) return statuses;
  return (["primary", "secondary"] as const).map((id) => ({
    accountType: null,
    available: true,
    connected: false,
    default: id === "primary",
    email: null,
    error: null,
    id,
    label: id === "primary" ? "Primary Codex" : "Secondary Codex",
    planType: null
  }));
}

function omit<T>(current: LoginState<T>, id: CodexConnectionId) {
  const next = { ...current };
  delete next[id];
  return next;
}
