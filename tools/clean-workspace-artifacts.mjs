#!/usr/bin/env node

import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workspaceRoots = ["apps", "packages", "tools"].map((dir) => join(root, dir));
const removableNames = new Set([".turbo", "dist", "dist-types", "node_modules"]);

function removeNestedArtifacts(dir) {
  if (!existsSync(dir)) {
    return;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = join(dir, entry.name);

    if (removableNames.has(entry.name)) {
      rmSync(fullPath, { force: true, recursive: true });
      continue;
    }

    removeNestedArtifacts(fullPath);
  }
}

for (const workspaceRoot of workspaceRoots) {
  removeNestedArtifacts(workspaceRoot);
}

console.log("Cleaned nested workspace artifacts under apps, packages, and tools");
