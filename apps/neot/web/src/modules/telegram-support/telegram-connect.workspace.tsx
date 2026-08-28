import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LogIn,
  MessageCircle,
  Settings2,
  ShieldCheck,
  Smartphone
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import {
  beginTelegramConnection,
  disconnectTelegram,
  submitTelegramPassword,
  telegramStatus
} from "./telegram-support.services";

export function TelegramConnectWorkspace() {
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["telegram-status"],
    queryFn: telegramStatus,
    refetchInterval: 2000
  });
  const connect = useMutation({
    mutationFn: beginTelegramConnection,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["telegram-status"] })
  });
  const passwordLogin = useMutation({
    mutationFn: submitTelegramPassword,
    onSuccess: () => setPassword("")
  });
  const disconnect = useMutation({
    mutationFn: disconnectTelegram,
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["telegram-status"] })
  });
  const connected = status.data?.connected === true;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-9 p-8 lg:p-12">
      <header className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-sky-600">TELEGRAM ACCOUNT</span>
        <h1 className="text-3xl font-semibold tracking-tight">Connect Telegram</h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          Authorize NEOT as a Telegram application. Scan the QR code with a Telegram mobile
          app to connect your account, receive task updates, and use the shared chat workspace.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="flex min-h-[430px] flex-col items-center justify-center gap-6 rounded-2xl bg-muted/40 p-6 text-center lg:p-8">
          {connected ? (
            <ConnectedState
              displayName={status.data?.displayName ?? "Telegram user"}
              username={status.data?.telegramUsername ?? ""}
              disconnecting={disconnect.isPending}
              onDisconnect={() => disconnect.mutate()}
            />
          ) : null}
          {!connected && status.data && !status.data.configured ? <ConfigurationState /> : null}
          {!connected && status.data?.configured && status.data.qrUrl ? (
            <QrLoginState qrUrl={status.data.qrUrl} />
          ) : null}
          {!connected && status.data?.status === "waiting-for-password" ? (
            <PasswordState
              hint={status.data.passwordHint}
              password={password}
              pending={passwordLogin.isPending}
              onPasswordChange={setPassword}
              onSubmit={() => passwordLogin.mutate(password)}
            />
          ) : null}
          {!connected &&
          status.data?.configured &&
          !status.data.qrUrl &&
          status.data.status !== "waiting-for-password" ? (
            <StartState pending={connect.isPending} onStart={() => connect.mutate()} />
          ) : null}
          {connect.error || passwordLogin.error || status.error || status.data?.error ? (
            <p className="max-w-lg text-sm text-destructive">
              {status.data?.error ||
                String((connect.error ?? passwordLogin.error ?? status.error)?.message)}
            </p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 pt-2">
          <Feature
            icon={ShieldCheck}
            title="Encrypted session"
            text="The Telegram authorization session is encrypted before it is stored in MariaDB."
          />
          <Feature
            icon={MessageCircle}
            title="Account connection"
            text="This is full Telegram account authorization through MTProto, not a BotFather pairing link."
          />
        </aside>
      </section>
    </main>
  );
}

function StartState({ pending, onStart }: { pending: boolean; onStart: () => void }) {
  return (
    <>
      <div className="rounded-full bg-sky-100 p-4 text-sky-700">
        <Smartphone className="size-8" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-xl font-semibold">Link your Telegram account</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          NEOT will create a short-lived QR code. Approve it from Telegram under Settings →
          Devices → Link Desktop Device.
        </p>
      </div>
      <Button disabled={pending} onClick={onStart}>
        <LogIn className="size-4" />
        {pending ? "Starting…" : "Show QR code"}
      </Button>
    </>
  );
}

function QrLoginState({ qrUrl }: { qrUrl: string }) {
  return (
    <>
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <QRCodeSVG value={qrUrl} size={240} level="M" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-xl font-semibold">Scan with Telegram</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Open Telegram on your phone, go to Settings → Devices → Link Desktop Device, then scan
          this code. It refreshes automatically.
        </p>
      </div>
      <Button variant="outline" asChild>
        <a href={qrUrl}>
          Open in Telegram <ExternalLink className="size-4" />
        </a>
      </Button>
    </>
  );
}

function PasswordState({
  hint,
  password,
  pending,
  onPasswordChange,
  onSubmit
}: {
  hint: string;
  password: string;
  pending: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="flex w-full max-w-sm flex-col items-center gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="rounded-full bg-sky-100 p-4 text-sky-700">
        <KeyRound className="size-8" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Two-step verification</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Enter your Telegram password{hint ? ` — hint: ${hint}` : ""}. It is sent only to the
          active authorization flow and is never stored.
        </p>
      </div>
      <Input
        aria-label="Telegram two-step verification password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
      />
      <Button disabled={pending || !password.trim()}>{pending ? "Verifying…" : "Continue"}</Button>
    </form>
  );
}

function ConnectedState({
  displayName,
  username,
  disconnecting,
  onDisconnect
}: {
  displayName: string;
  username: string;
  disconnecting: boolean;
  onDisconnect: () => void;
}) {
  return (
    <>
      <div className="rounded-full bg-emerald-100 p-4 text-emerald-700">
        <CheckCircle2 className="size-8" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">Telegram connected</h2>
        <p className="text-sm text-muted-foreground">
          {displayName}
          {username ? ` · @${username}` : ""}
        </p>
      </div>
      <Button asChild>
        <a href="/app/neot/telegram-chat">Open Telegram workspace</a>
      </Button>
      <Button variant="outline" disabled={disconnecting} onClick={onDisconnect}>
        Disconnect account
      </Button>
    </>
  );
}

function ConfigurationState() {
  return (
    <>
      <div className="rounded-full bg-amber-100 p-4 text-amber-800">
        <Settings2 className="size-8" />
      </div>
      <div className="flex max-w-lg flex-col gap-2">
        <h2 className="text-xl font-semibold">Finish MTProto configuration</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Add the Telegram application API ID, API hash, and session-encryption key to the server
          environment, then restart the API.
        </p>
      </div>
    </>
  );
}

function Feature({
  icon: Icon,
  title,
  text
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-sky-600" />
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
