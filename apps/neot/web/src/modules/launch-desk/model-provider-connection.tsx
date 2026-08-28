import { Button } from "@neot/ui/components/button";
import {
  CheckCircle2Icon,
  KeyRoundIcon,
  LoaderCircleIcon,
  PlugZapIcon,
  UnplugIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ModelProviderStatus } from "./launch-desk.types";

type ConnectionInput = { apiKey?: string; baseUrl: string; label: string; model: string };

export function ModelProviderConnection({
  onDisconnect,
  onSave,
  onTest,
  pending,
  status
}: {
  onDisconnect: () => void;
  onSave: (input: ConnectionInput) => void;
  onTest: () => void;
  pending: boolean;
  status: ModelProviderStatus;
}) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(status.baseUrl);
  const [model, setModel] = useState(status.model);

  useEffect(() => {
    setBaseUrl(status.baseUrl);
    setModel(status.model);
    if (status.configured) setEditing(false);
  }, [status]);

  const save = () => {
    onSave({
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      baseUrl: baseUrl.trim(),
      label: status.label,
      model: model.trim()
    });
    setApiKey("");
  };

  return (
    <article className="grid gap-4 border-b px-6 py-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/30">
            <PlugZapIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{status.label}</h2>
              {status.default ? <Badge>Default</Badge> : null}
              <Badge>{status.runtime === "codex" ? "Native Codex" : "OpenCode bridge"}</Badge>
            </div>
            <p className="truncate pt-1 text-sm text-muted-foreground">
              {status.model} · {status.capabilities.join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`flex items-center gap-2 pr-2 text-sm ${
              status.connected ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {pending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <CheckCircle2Icon className="size-4" />
            )}
            {status.connected ? "Verified" : status.configured ? "Configured" : "Not configured"}
          </span>
          {status.configured ? (
            <Button disabled={pending} onClick={onTest} size="sm" variant="outline">
              Test
            </Button>
          ) : null}
          <Button
            disabled={pending}
            onClick={() => setEditing((value) => !value)}
            size="sm"
            variant="outline"
          >
            <KeyRoundIcon /> {editing ? "Close" : "Configure"}
          </Button>
          {status.configured && !status.default ? (
            <Button disabled={pending} onClick={onDisconnect} size="sm" variant="ghost">
              <UnplugIcon /> Disconnect
            </Button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div className="grid gap-3 border-t pt-4 md:grid-cols-[1fr_1fr_auto]">
          <Field label="Model" onChange={setModel} value={model} />
          <Field label="Base URL" onChange={setBaseUrl} value={baseUrl} />
          <label className="grid gap-1.5 text-sm font-medium md:col-span-2">
            {status.provider === "opencode" ? "Server credential (optional)" : "API key"}
            <input
              autoComplete="off"
              className="h-10 rounded-md border bg-background px-3 font-mono text-sm"
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={
                status.configured ? "Leave blank to keep the saved key" : "Paste credential"
              }
              type="password"
              value={apiKey}
            />
          </label>
          <Button
            className="self-end"
            disabled={
              pending ||
              !model.trim() ||
              !baseUrl.trim() ||
              (!status.configured && status.provider !== "opencode" && apiKey.trim().length < 20)
            }
            onClick={save}
          >
            Save connection
          </Button>
          <p className="text-xs leading-5 text-muted-foreground md:col-span-3">
            Credentials are encrypted in MariaDB and are never returned to this browser or added to
            prompts.
          </p>
        </div>
      ) : null}
      {status.error ? <p className="text-sm text-destructive">{status.error}</p> : null}
    </article>
  );
}

function Field({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        className="h-10 rounded-md border bg-background px-3 text-sm"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}
