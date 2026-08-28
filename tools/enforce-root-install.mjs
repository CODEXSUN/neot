#!/usr/bin/env node

import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const installDirectory = resolve(process.env.INIT_CWD ?? process.cwd());
const userAgent = process.env.npm_config_user_agent ?? "";

if (!userAgent.startsWith("npm/")) {
  console.error("NEOT uses npm only. pnpm, yarn, and other package managers are not allowed.");
  console.error(`Run: cd "${root}" && npm install`);
  process.exit(1);
}

if (installDirectory !== root) {
  console.error("Dependencies must be installed from the repository root.");
  console.error(`Run: cd "${root}" && npm install`);
  process.exit(1);
}
