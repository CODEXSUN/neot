import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const repositoryRoot = process.cwd();
const ignoredRootDirectories = new Set([".git", ".idea", "dist", "node_modules"]);
const forbiddenDirectoryNames = new Set(["dist", "dist-types", "node_modules"]);
const forbiddenLockfiles = new Set(["pnpm-lock.yaml", "yarn.lock"]);
const violations = [];

function scan(directory, isRoot = false) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (isRoot && ignoredRootDirectories.has(entry.name)) {
      continue;
    }

    const entryPath = join(directory, entry.name);
    const displayPath = relative(repositoryRoot, entryPath).replaceAll("\\", "/");

    if (entry.isDirectory()) {
      if (forbiddenDirectoryNames.has(entry.name)) {
        violations.push(displayPath);
        continue;
      }
      scan(entryPath);
    } else if (forbiddenLockfiles.has(entry.name)) {
      violations.push(displayPath);
    }
  }
}

scan(repositoryRoot, true);

if (violations.length > 0) {
  throw new Error(`Invalid nested dependency or build output: ${violations.join(", ")}`);
}

console.info("Framework dependency layout check passed.");
