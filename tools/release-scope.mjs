#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = changedFiles();
const groups = groupFiles(files);

console.log(`Release scope inventory: ${files.length} changed path(s)`);
for (const group of groups) {
  console.log(`\n${group.name}: ${group.files.length}`);
  for (const file of group.files) console.log(`- ${file}`);
}

function changedFiles() {
  const output = git(["status", "--porcelain", "--untracked-files=all"]);
  return output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .map((file) => file.includes(" -> ") ? file.split(" -> ").at(-1) : file)
    .sort((left, right) => left.localeCompare(right));
}

function groupFiles(files) {
  const definitions = [
    ["Desktop database and native commands", /^apps\/neot\/desktop\/src-tauri\/(?:migrations|src\/)/u],
    ["Desktop workspace and agent experience", /^apps\/neot\/desktop\/src\/(?:(?:workspaces|shell|services|contracts|standalone\/compass-runner)\/|styles\.css$)/u],
    ["Desktop icons and packaging", /^apps\/neot\/desktop\/(?:src-tauri\/icons|src-tauri\/(?:Cargo|tauri\.conf)|package\.json)/u],
    ["Local AI environment", /^\.container\/local-ai\//u],
    ["Container deployment and operations", /^(?:\.container\/(?!local-ai\/)|assist\/deploy\.md$)/u],
    ["Application and package versions", /^(?:package(?:-lock)?\.json|apps\/[^/]+\/[^/]+\/package\.json|packages\/[^/]+\/package\.json)$/u],
    ["Runtime configuration and repository hygiene", /^(?:\.env\.example|\.gitignore)$/u],
    ["Release documentation and skills", /^assist\/(?:documentation|skills|AGENT-GUIDE\.md|README\.md)/u],
    ["Release tools", /^tools\//u]
  ];
  const remaining = new Set(files);
  const groups = definitions.map(([name, pattern]) => {
    const matching = files.filter((file) => pattern.test(file));
    matching.forEach((file) => remaining.delete(file));
    return { files: matching, name };
  });
  const unclassified = [...remaining].sort((left, right) => left.localeCompare(right));
  if (unclassified.length) groups.push({ files: unclassified, name: "Unclassified" });
  return groups.filter((group) => group.files.length);
}

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}
