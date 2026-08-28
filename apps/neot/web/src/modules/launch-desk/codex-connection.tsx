import { Button } from "@neot/ui/components/button";
import {
  CheckCircle2Icon,
  CircleIcon,
  CopyIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  LoaderCircleIcon,
  LogOutIcon,
  TerminalIcon
} from "lucide-react";
import { useState } from "react";
import type { BrowserLogin, CodexConnectionStatus, DeviceLogin } from "./launch-desk.types";

type Props = {
  browserLogin: BrowserLogin | null;
  compact: boolean;
  deviceLogin: DeviceLogin | null;
  onApiKeyConnect: (apiKey: string) => void;
  onBrowserConnect: () => void;
  onCancelLogin: () => void;
  onDeviceConnect: () => void;
  onDisconnect: () => void;
  pending: boolean;
  status: CodexConnectionStatus;
};

export function CodexConnection(props: Props) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const connected = props.status.connected;

  const connectApiKey = () => {
    const value = apiKey.trim();
    if (!value) return;
    props.onApiKeyConnect(value);
    setApiKey("");
  };

  return (
    <article className={`grid gap-4 border-b ${props.compact ? "px-5 py-3" : "px-6 py-5"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/30">
            <TerminalIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold leading-tight">{props.status.label}</h2>
              {props.status.default ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Default
                </span>
              ) : null}
            </div>
            <p className="truncate pt-1 text-sm text-muted-foreground">
              Isolated credentials and Codex App Server process
            </p>
          </div>
        </div>
        {connected ? (
          <ConnectedState onDisconnect={props.onDisconnect} status={props.status} />
        ) : props.browserLogin ? (
          <PendingBrowser onCancel={props.onCancelLogin} />
        ) : props.deviceLogin ? (
          <PendingDevice login={props.deviceLogin} onCancel={props.onCancelLogin} />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 pr-2 text-sm text-muted-foreground">
              <CircleIcon className="size-3 fill-current" /> Disconnected
            </span>
            <Button disabled={props.pending} onClick={props.onBrowserConnect} size="sm">
              <ExternalLinkIcon /> Browser
            </Button>
            <Button
              disabled={props.pending}
              onClick={props.onDeviceConnect}
              size="sm"
              variant="outline"
            >
              <TerminalIcon /> Device code
            </Button>
            <Button
              disabled={props.pending}
              onClick={() => setShowApiKey((value) => !value)}
              size="sm"
              variant="outline"
            >
              <KeyRoundIcon /> API key
            </Button>
          </div>
        )}
      </div>
      {showApiKey && !connected ? (
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end">
          <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium">
            OpenAI API key
            <input
              autoComplete="off"
              className="h-10 rounded-md border bg-background px-3 font-mono text-sm outline-none focus:border-primary"
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="sk-..."
              type="password"
              value={apiKey}
            />
          </label>
          <Button disabled={props.pending || apiKey.trim().length < 20} onClick={connectApiKey}>
            {props.pending ? <LoaderCircleIcon className="animate-spin" /> : <KeyRoundIcon />}
            Connect key
          </Button>
          <p className="max-w-sm text-sm leading-5 text-muted-foreground">
            The key goes directly to the server-side Codex login process. The browser does not save
            it.
          </p>
        </div>
      ) : null}
      {props.status.error && !connected ? (
        <p className="text-sm text-destructive">{props.status.error}</p>
      ) : null}
    </article>
  );
}

function ConnectedState({
  onDisconnect,
  status
}: {
  onDisconnect: () => void;
  status: CodexConnectionStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2Icon className="size-4" /> Connected
      </span>
      <span className="max-w-64 truncate">{status.email ?? "API key account"}</span>
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide">
        {status.planType ?? status.accountType ?? "Codex"}
      </span>
      <Button onClick={onDisconnect} size="sm" variant="ghost">
        <LogOutIcon /> Disconnect
      </Button>
    </div>
  );
}

function PendingBrowser({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex items-center gap-3 text-sm text-amber-700 dark:text-amber-400">
      <LoaderCircleIcon className="size-4 animate-spin" /> Finish sign-in in your browser
      <Button onClick={onCancel} size="sm" variant="ghost">
        Cancel
      </Button>
    </div>
  );
}

function PendingDevice({ login, onCancel }: { login: DeviceLogin; onCancel: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
        <LoaderCircleIcon className="size-4 animate-spin" /> Awaiting approval
      </span>
      <button
        className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 font-mono font-semibold tracking-[0.14em]"
        onClick={() => void navigator.clipboard.writeText(login.userCode)}
        type="button"
      >
        {login.userCode}
        <CopyIcon className="size-4" />
      </button>
      <Button
        onClick={() => window.open(login.verificationUrl, "_blank", "noopener,noreferrer")}
        size="sm"
      >
        <ExternalLinkIcon /> Open authentication page
      </Button>
      <Button onClick={onCancel} size="sm" variant="ghost">
        Cancel
      </Button>
    </div>
  );
}
