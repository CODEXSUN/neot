#!/usr/bin/env node

import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const workspaceRoots = ["apps", "packages", "tools"].map((directory) => join(root, directory));
const forbiddenDirectoryNames = new Set(["dist", "dist-types", "node_modules"]);
const nestedArtifacts = [];

function findNestedArtifacts(directory) {
  if (!existsSync(directory)) {
    return;
  }

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const fullPath = join(directory, entry.name);

    if (forbiddenDirectoryNames.has(entry.name)) {
      nestedArtifacts.push(relative(root, fullPath));
      continue;
    }

    findNestedArtifacts(fullPath);
  }
}

for (const workspaceRoot of workspaceRoots) {
  findNestedArtifacts(workspaceRoot);
}

if (nestedArtifacts.length > 0) {
  console.error("Workspace-local dependency and build-output folders are not allowed:");
  for (const directory of nestedArtifacts) {
    console.error(`- ${directory}`);
  }
  console.error("Run npm run dependencies:clean from the repository root.");
  process.exit(1);
}

console.log("Artifact layout verified: dependencies and build output stay at the repository root");
