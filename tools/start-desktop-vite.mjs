#!/usr/bin/env node

import { spawn } from "node:child_process";
import net from "node:net";
import { resolve } from "node:path";

const host = "127.0.0.1";
const port = 1620;

if (await hasListener(host, port)) {
  console.log(`NEOT desktop development service is already running at http://${host}:${port}. Reusing it.`);
  process.exit(0);
}

const vite = resolve(import.meta.dirname, "..", "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [vite, "--host", host, "--port", String(port)], {
  stdio: "inherit"
});

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
