import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useEffect, useRef } from "react";

export function AgentRunTerminal({ lines }: { lines: string[] }) {
  const host = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!host.current) return;
    const instance = new Terminal({
      convertEol: true,
      cursorBlink: false,
      disableStdin: true,
      fontFamily: "Geist Mono, ui-monospace, monospace",
      fontSize: 12,
      rows: 8,
      theme: { background: "#10151d", foreground: "#d7e0ea", green: "#52d3a5" }
    });
    const fit = new FitAddon();
    instance.loadAddon(fit);
    instance.open(host.current);
    fit.fit();
    terminal.current = instance;
    const resize = new ResizeObserver(() => fit.fit());
    resize.observe(host.current);
    return () => {
      resize.disconnect();
      instance.dispose();
      terminal.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = terminal.current;
    if (!instance) return;
    instance.clear();
    lines.forEach((line) => instance.writeln(line));
  }, [lines]);

  return <div aria-label="Agent run log" className="h-full min-h-36 bg-[#10151d] p-3" ref={host} />;
}
