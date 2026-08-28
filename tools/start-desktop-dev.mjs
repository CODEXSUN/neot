#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import net from "node:net";

const host = "127.0.0.1";
const port = 1620;

if (await hasListener(host, port) && hasDesktopProcess()) {
  console.log(`NEOT desktop is already running at http://${host}:${port}. Reusing the active development service.`);
  process.exit(0);
}

const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm.cmd", "run", "tauri:dev", "--workspace", "@neot/desktop"]
  : ["run", "tauri:dev", "--workspace", "@neot/desktop"];
const child = spawn(command, args, { stdio: "inherit" });

child.once("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

function hasListener(address, targetPort) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: address, port: targetPort });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function hasDesktopProcess() {
  if (process.platform !== "win32") return false;
  const output = execFileSync("tasklist", ["/FI", "IMAGENAME eq NEOT.exe", "/NH"], { encoding: "utf8" });
  return output.includes("NEOT.exe");
}
