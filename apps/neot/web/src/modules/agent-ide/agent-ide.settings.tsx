import { Button } from "@neot/ui/components/button";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import { RefreshCwIcon, ServerCogIcon } from "lucide-react";
import type { AgentIdeSettings } from "./agent-ide.types";

export function AgentIdeSettingsPanel({
  error,
  onTest,
  pending,
  settings
}: {
  error?: string;
  onTest: () => void;
  pending: boolean;
  settings?: AgentIdeSettings;
}) {
  return (
    <section className="border-b bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border bg-background">
            <ServerCogIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">OpenAI backend</p>
              <WorkspaceStatusBadge
                label={settings?.configured ? "Configured" : "Not configured"}
                tone={settings?.configured ? "success" : "warning"}
              />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {settings?.model ?? "Model unavailable"} ·{" "}
              {settings?.baseUrl ?? "Set OPENAI_API_KEY in .env"}
            </p>
          </div>
        </div>
        <Button
          disabled={!settings?.configured || pending}
          onClick={onTest}
          size="sm"
          variant="outline"
        >
          <RefreshCwIcon className={pending ? "animate-spin" : ""} />
          Test connection
        </Button>
      </div>
      {error ? <p className="pt-2 text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
