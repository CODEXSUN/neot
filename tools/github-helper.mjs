#!/usr/bin/env node

import { execFileSync, execSync } from "node:child_process";
import { platform } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { formatChangelogCommitSubject, readLatestVersionedChangelogEntry } from "./changelog.mjs";

const root = resolve(import.meta.dirname, "..");

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  let changelogEntry = readLatestVersionedChangelogEntry(root);
  let defaultMessage = formatChangelogCommitSubject(changelogEntry);
  const files = changedFiles();

  printSummary(changelogEntry.version, defaultMessage, files);
  if (dryRun) {
    console.log(renderReviewBox({ fileCount: files.length, subject: defaultMessage, version: changelogEntry.version }));
    console.log("  Dry run only. No pull, commit, or push was performed.\n");
    return;
  }

  const message = await withPrompt(async (ask) => {
    console.log(renderReviewBox({ fileCount: files.length, subject: defaultMessage, version: changelogEntry.version }));
    const shouldBump = isYes(await ask("  Bump next version before commit? [y/N]: "));
    if (shouldBump) {
      const title = (await ask("  Version title [version update]: ", "version update")).trim() || "version update";
      runVersionBump(title);
      changelogEntry = readLatestVersionedChangelogEntry(root);
      defaultMessage = formatChangelogCommitSubject(changelogEntry);
      console.log(`\n  Bumped to ${changelogEntry.version}`);
      console.log(`  Commit subject: ${defaultMessage}\n`);
    }
    const subject = (await ask(`  Commit message [${defaultMessage}]: `, defaultMessage)).trim() || defaultMessage;
    if (!isYes(await ask("  Continue with pull, commit, and push? [y/N]: "))) throw new Error("Cancelled.");
    return subject;
  });

  checkAndPull();
  console.log("  > git add -A (excluding local build output)");
  runGit(releaseStageArguments());
  console.log(`  > git commit -m "${message}"`);
  runGit(["commit", "-m", message]);
  console.log("  > git push");
  runGit(["push"]);
  console.log(`\n  Done - ${message}\n`);
}

function printSummary(version, subject, files) {
  console.log(`\n  Changelog version: ${version}`);
  console.log(`  Commit subject:    ${subject}`);
  console.log(`  Uncommitted:       ${files.length} files\n`);
  files.forEach((file) => console.log(`    ${file}`));
  if (files.length) console.log("");
}

function changedFiles() {
  const status = run("git status --porcelain", { silent: true });
  return status ? status.split("\n").filter(Boolean) : [];
}

function releaseStageArguments() {
  return [
    "add",
    "-A",
    "--",
    ".",
    ":(exclude)**/target/",
    ":(exclude)apps/neot/desktop/src-tauri/target-*-test/",
    ":(exclude)**/.tauri/"
  ];
}

function runVersionBump(title) {
  execFileSync(
    process.execPath,
    ["tools/repository-release.mjs", "version:bump", "--title", title],
    { cwd: root, stdio: "inherit" }
  );
}

function checkAndPull() {
  const upstream = runGitQuiet(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  if (!upstream) {
    console.log("\n  No upstream branch found. Skipping pull.\n");
    return;
  }
  console.log("\n  > git fetch");
  runGit(["-c", "maintenance.auto=false", "-c", "gc.auto=0", "fetch", "--quiet"]);
  const behind = Number(runGitQuiet(["rev-list", "--count", `HEAD..${upstream}`]) || 0);
  if (!behind) {
    console.log("  Already up to date.\n");
    return;
  }
  console.log(`  Branch is behind ${upstream} by ${behind} commit(s).`);
  console.log("  > git pull --rebase --autostash");
  runGit(["-c", "maintenance.auto=false", "-c", "gc.auto=0", "pull", "--rebase", "--autostash"]);
  console.log("");
}

function run(command, options = {}) {
  const result = execSync(command, {
    cwd: root,
    encoding: "utf8",
    stdio: options.silent ? "pipe" : "inherit"
  });
  return result ? result.trim() : "";
}

function runGit(args, options = {}) {
  const result = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.silent ? "pipe" : "inherit"
  });
  return result ? result.trim() : "";
}

function runGitQuiet(args) {
  try { return runGit(args, { silent: true }); } catch { return ""; }
}

async function withPrompt(callback) {
  if (!process.stdin.isTTY && platform() === "win32") return callback(askWindowsModal);
  if (!process.stdin.isTTY) throw new Error("Interactive terminal input is required for github:now.");
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await callback((question, defaultValue = "") => new Promise((resolveAnswer) => {
      readline.question(question, (answer) => resolveAnswer(answer || defaultValue));
    }));
  } finally {
    readline.close();
  }
}

function askWindowsModal(question, defaultValue = "") {
  const confirmation = /\[y\/N\]:\s*$/iu.test(question);
  const script = confirmation
    ? [
        "Add-Type -AssemblyName System.Windows.Forms",
        `$result = [System.Windows.Forms.MessageBox]::Show(${quotePowerShell(question.replace(/\s*\[y\/N\]:\s*$/iu, ""))}, 'GitHub Commit Review', 'YesNo', 'Question')`,
        "if ($result -eq 'Yes') { 'yes' } else { 'no' }"
      ].join("; ")
    : [
        "Add-Type -AssemblyName Microsoft.VisualBasic",
        `[Microsoft.VisualBasic.Interaction]::InputBox(${quotePowerShell(question)}, 'GitHub Commit Review', ${quotePowerShell(defaultValue)})`
      ].join("; ");
  return execFileSync("powershell.exe", ["-NoProfile", "-STA", "-Command", script], {
    encoding: "utf8",
    windowsHide: false
  }).trim();
}

function renderReviewBox({ fileCount, subject, version }) {
  const rows = ["GitHub Commit Review", `Version: ${version}`, `Subject: ${subject}`, `Files: ${fileCount}`];
  const width = Math.max(...rows.map((row) => row.length)) + 4;
  const border = `+${"-".repeat(width)}+`;
  return ["", border, ...rows.map((row) => `| ${row.padEnd(width - 2)} |`), border, ""].join("\n");
}

function quotePowerShell(value) { return `'${value.replaceAll("'", "''")}'`; }
function isYes(value) { return ["y", "yes"].includes(value.trim().toLowerCase()); }

main().catch((error) => {
  console.error(`\n  Error: ${error.message}\n`);
  process.exit(1);
});
