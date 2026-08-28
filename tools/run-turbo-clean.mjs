#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const turboBin = resolve(root, "node_modules", "turbo", "bin", "turbo");
const args = process.argv.slice(2);
const envPath = join(root, ".env");

if (!args.length) {
  console.error("Usage: node tools/run-turbo-clean.mjs <turbo arguments>");
  process.exit(1);
}

if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const turboArgs = args.includes("--cache-dir") ? args : [...args, "--cache-dir", ".turbo/cache"];
const command = existsSync(turboBin) ? process.execPath : "turbo";
const commandArgs = existsSync(turboBin) ? [turboBin, ...turboArgs] : turboArgs;
const result = spawnSync(command, commandArgs, {
  cwd: root,
  stdio: "inherit"
});

await import("./clean-workspace-artifacts.mjs");

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.signal) {
  process.kill(process.pid, result.signal);
}

process.exit(result.status ?? 1);
