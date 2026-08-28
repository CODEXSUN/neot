import "@xterm/xterm/css/xterm.css";
import { listen } from "@tauri-apps/api/event";
import { Terminal as Xterm } from "@xterm/xterm";
import { ChevronDown, Eraser, Loader2, TerminalSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TerminalOutput, TerminalShell, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function TerminalPanel({
  workspace,
  theme
}: {
  workspace: Workspace;
  theme: "dark" | "light";
}) {
  const host = useRef<HTMLDivElement>(null);
  const terminal = useRef<Xterm | undefined>(undefined);
  const session = useRef<string | undefined>(undefined);
  const [error, setError] = useState<string>();
  const [shell, setShell] = useState<TerminalShell>("powershell");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    setError(undefined);
    setReady(false);
    const xterm = new Xterm({
      convertEol: true,
      cursorBlink: true,
      fontFamily: '"Cascadia Code", Consolas, monospace',
      fontSize: 12,
      scrollback: 3000,
      theme:
        theme === "dark"
          ? {
              background: "#181a1d",
              foreground: "#e4e7eb",
              cursor: "#6ea8fe",
              selectionBackground: "#34465c"
            }
          : {
              background: "#ffffff",
              foreground: "#34373b",
              cursor: "#1a73e8",
              selectionBackground: "#cfe2fb"
            }
    });
    terminal.current = xterm;
    xterm.open(host.current);
    let disposed = false;
    let removeListener: (() => void) | undefined;
    void (async () => {
      removeListener = await listen<TerminalOutput>("terminal-output", (event) => {
        if (event.payload.sessionId === session.current) xterm.write(event.payload.data);
      });
      if (disposed) return;
      const id = await desktopClient.startTerminal(shell);
      try {
        if (disposed) return void desktopClient.closeTerminal(id);
        session.current = id;
        xterm.onData((data) => void desktopClient.writeTerminal(id, data));
        void desktopClient.writeTerminal(id, "\r");
        if (!disposed) setReady(true);
      } catch (reason) {
        setError(String(reason));
        xterm.writeln("Terminal could not start.");
        if (!disposed) setReady(true);
      }
    })().catch((reason) => {
      setError(String(reason));
      xterm.writeln("Terminal could not start.");
      if (!disposed) setReady(true);
    });
    return () => {
      disposed = true;
      removeListener?.();
      if (session.current) void desktopClient.closeTerminal(session.current);
      xterm.dispose();
    };
  }, [shell, theme]);

  return (
    <section aria-label={`Terminal for ${workspace.name}`} className="terminal">
      <div className="terminal-tabs">
        <label className="terminal-shell-picker" title={workspace.path}>
          <TerminalSquare size={14} />
          <select
            aria-label="Terminal shell"
            onChange={(event) => setShell(event.target.value as TerminalShell)}
            value={shell}
            disabled={!ready}
          >
            <option value="powershell">PowerShell</option>
            <option value="gitBash">Git Bash</option>
          </select>
          <ChevronDown size={12} />
        </label>
        {error ? (
          <span className="terminal-error" title={error}>
            {error}
          </span>
        ) : !ready ? (
          <span className="terminal-loading-inline" role="status" aria-live="polite">
            <Loader2 size={14} className="spin" />
            <span>Starting terminal...</span>
          </span>
        ) : null}
        <button
          aria-label="Clear terminal"
          onClick={() => terminal.current?.clear()}
          title="Clear terminal"
          type="button"
          disabled={!ready}
        >
          <Eraser size={13} />
        </button>
      </div>
      <div className="terminal-host" ref={host} />
    </section>
  );
}
