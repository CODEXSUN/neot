#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packages = [
  "packages/framework",
  "packages/ui",
  "apps/neot/api",
  "apps/neot/web"
];

for (const packagePath of packages) {
  const directory = resolve(root, packagePath);
  if (!existsSync(resolve(directory, "package.json"))) {
    console.error(`[install] missing internal workspace package: ${directory}`);
    process.exit(1);
  }
}

console.info("[install] installing the self-contained NEOT workspace");
runNpm(["install", "--no-audit", "--no-fund"], root);
console.info("[install] NEOT, Platform, Framework, and UI workspaces are ready.");

function runNpm(args, cwd) {
  const executable = process.env.npm_execpath ? process.execPath : "npm";
  const commandArgs = process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, commandArgs, { cwd, stdio: "inherit" });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) process.exit(result.status ?? 1);
}
