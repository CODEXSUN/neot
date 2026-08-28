import { Button, Input, Label, WorkspaceStatusBadge } from "@neot/ui";
import {
  CloudDownloadIcon,
  CloudUploadIcon,
  CopyIcon,
  KeyRoundIcon,
  LinkIcon,
  RefreshCwIcon,
  UnlinkIcon
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useSyncActions, useSyncTokens } from "./sync.hooks";
import type { SyncStatus } from "./sync.types";

export function LocalConnectionPanel({ sync }: { sync: SyncStatus | undefined }) {
  const actions = useSyncActions();
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!sync?.bound && sync?.instanceId) setInstanceId(sync.instanceId);
  }, [sync?.bound, sync?.instanceId]);

  if (!sync) return <p className="text-sm text-muted-foreground">Reading saved connection…</p>;
  if (!sync.bound)
    return (
      <BindingForm
        actions={actions}
        instanceId={instanceId}
        setInstanceId={setInstanceId}
        setToken={setToken}
        token={token}
      />
    );

  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <ConnectionFact label="Installation" value={sync.instanceId} />
        <ConnectionFact label="Last verified" value={formatTime(sync.lastVerifiedAt)} />
        <ConnectionFact
          label="Last transfer"
          value={formatTime(latestTime(sync.lastPublishedAt, sync.lastPulledAt))}
        />
      </dl>
      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button
          disabled={actions.verify.isPending}
          icon={<RefreshCwIcon />}
          onClick={() =>
            void runAction(
              () => actions.verify.mutateAsync(),
              "Cloud connection verified.",
              "Connection verification failed."
            )
          }
          variant="outline"
        >
          Verify
        </Button>
        <Button
          disabled={actions.pull.isPending}
          icon={<CloudDownloadIcon />}
          onClick={() =>
            void runAction(
              () => actions.pull.mutateAsync(),
              "Latest cloud revision pulled.",
              "Cloud pull failed."
            )
          }
          variant="outline"
        >
          Pull latest
        </Button>
        <Button
          disabled={actions.publish.isPending}
          icon={<CloudUploadIcon />}
          onClick={() =>
            void runAction(
              () => actions.publish.mutateAsync(),
              "Local changes published.",
              "Cloud publish failed."
            )
          }
        >
          Publish changes
        </Button>
        <Button
          className="sm:ml-auto"
          disabled={actions.disconnect.isPending}
          icon={<UnlinkIcon />}
          onClick={() => {
            if (
              window.confirm(
                "Disconnect this installation from NEOT Cloud? Local data will remain unchanged."
              )
            )
              void runAction(
                () => actions.disconnect.mutateAsync(),
                "Cloud connection removed. Local data was kept.",
                "Disconnect failed."
              );
          }}
          variant="ghost"
        >
          Disconnect
        </Button>
      </div>
    </div>
  );
}

function BindingForm({
  actions,
  instanceId,
  setInstanceId,
  setToken,
  token
}: {
  actions: ReturnType<typeof useSyncActions>;
  instanceId: string;
  setInstanceId: (value: string) => void;
  setToken: (value: string) => void;
  token: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <Field label="Installation ID" name="sync-instance">
        <Input
          id="sync-instance"
          onChange={(event) => setInstanceId(event.target.value)}
          placeholder="home-office"
          value={instanceId}
        />
      </Field>
      <Field label="Cloud token" name="sync-token">
        <Input
          id="sync-token"
          maxLength={16}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste 16-character token"
          type="password"
          value={token}
        />
      </Field>
      <Button
        disabled={
          actions.bind.isPending || instanceId.trim().length < 2 || token.trim().length !== 16
        }
        icon={<LinkIcon />}
        onClick={() =>
          void runAction(
            () => actions.bind.mutateAsync({ instanceId, token }),
            "Connection verified and saved on this installation.",
            "Cloud binding failed.",
            () => setToken("")
          )
        }
      >
        Connect
      </Button>
    </div>
  );
}

export function CloudConnectionPanel() {
  const actions = useSyncActions();
  const tokens = useSyncTokens(true);
  const [label, setLabel] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");

  const generate = async () => {
    try {
      const result = await actions.generate.mutateAsync(label);
      setGeneratedToken(result.token);
      setLabel("");
      toast.success("Connection token generated and registered.");
    } catch (error) {
      showFailure(error, "Token generation failed.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-64 flex-1 space-y-2">
          <Label htmlFor="sync-label">Installation label</Label>
          <Input
            id="sync-label"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Sundar office workstation"
            value={label}
          />
        </div>
        <Button
          disabled={actions.generate.isPending || !label.trim()}
          icon={<KeyRoundIcon />}
          onClick={() => void generate()}
        >
          Generate connection token
        </Button>
      </div>

      {generatedToken ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">Copy this token now</p>
            <code className="text-base font-semibold tracking-widest">{generatedToken}</code>
          </div>
          <Button
            icon={<CopyIcon />}
            onClick={() => void copyToken(generatedToken)}
            size="sm"
            variant="outline"
          >
            Copy
          </Button>
        </div>
      ) : null}

      <div className="space-y-2 border-t pt-4">
        <h3 className="text-sm font-semibold">Issued connection tokens</h3>
        {tokens.data?.length ? (
          tokens.data.map((item) => (
            <div className="flex items-center gap-3 py-2 text-sm" key={item.uuid}>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.label}</p>
                <p className="text-muted-foreground">
                  Created {formatTime(item.createdAt)} · Last used {formatTime(item.lastUsedAt)}
                </p>
              </div>
              <WorkspaceStatusBadge
                label={item.status}
                tone={item.status === "active" ? "success" : "neutral"}
              />
              {item.status === "active" ? (
                <Button
                  disabled={actions.revoke.isPending}
                  onClick={() =>
                    void runAction(
                      () => actions.revoke.mutateAsync(item.uuid),
                      "Token revoked.",
                      "Token revocation failed."
                    )
                  }
                  size="sm"
                  variant="ghost"
                >
                  Revoke
                </Button>
              ) : (
                <span className="w-16" />
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No connection tokens have been issued.</p>
        )}
      </div>
    </div>
  );
}

function Field({ children, label, name }: { children: ReactNode; label: string; name: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {children}
    </div>
  );
}

function ConnectionFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="pt-1 font-medium">{value}</dd>
    </div>
  );
}

async function runAction<T>(
  action: () => Promise<T>,
  success: string,
  fallback: string,
  complete?: () => void
) {
  try {
    await action();
    complete?.();
    toast.success(success);
  } catch (error) {
    showFailure(error, fallback);
  }
}

function showFailure(error: unknown, fallback: string) {
  toast.error(error instanceof Error ? error.message : fallback);
}
async function copyToken(token: string) {
  await navigator.clipboard.writeText(token);
  toast.success("Token copied. It will not be shown again.");
}
function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}
function latestTime(left: string | null, right: string | null) {
  if (!left) return right;
  if (!right) return left;
  return new Date(left) > new Date(right) ? left : right;
}
