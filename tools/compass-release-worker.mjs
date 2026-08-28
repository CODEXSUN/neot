#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline";

const root = resolve(import.meta.dirname, "..");
const action = process.argv[2] ?? "inspect";
const title = valueAfter("--title") ?? "Compass release update";

await main();

async function main() {
  try {
    if (action === "inspect") inspect();
    else if (action === "validate") validate();
    else if (action === "version-bump") bump();
    else if (action === "commit-push") commitPush();
    else if (action === "publish-release") await publish();
    else throw new Error(`Unknown Compass release action: ${action}`);
  } catch (error) {
    event("error", error instanceof Error ? error.message : "Unknown release worker failure.");
    process.exitCode = 1;
  }
}

function inspect() {
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const changed = changedFiles();
  event("log", `Current package version: ${packageJson.version}`);
  event("log", `Changed files eligible for review: ${changed.length}`);
  event("log", "Ignored and temporary files are excluded by Git status.");
  event("result", "Release preflight collected live repository evidence.", { version: packageJson.version, changed, head: git(["rev-parse", "HEAD"]), branch: git(["branch", "--show-current"]) });
}

function validate() {
  event("log", "Running version consistency check.");
  npm(["run", "check:versions"]);
  event("log", "Running release scope review.");
  npm(["run", "release:scope"]);
  event("result", "Release checks passed. No files were changed.");
}

function bump() {
  const currentVersion = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
  const committedVersion = JSON.parse(git(["show", "HEAD:package.json"])).version;
  if (currentVersion !== committedVersion) {
    event("log", `An uncommitted version update to ${currentVersion} is already present; avoiding a duplicate bump.`);
    event("result", "Existing version references and changelog update were verified. No duplicate version was created.");
    return;
  }
  event("log", `Applying approved version bump: ${title}`);
  npm(["run", "version:bump", "--", "--title", title]);
  event("result", "Version references and changelog were updated by the repository release tool.");
}

function commitPush() {
  const message = releaseCommitSubject();
  syncUpstream();
  const files = changedFiles();
  if (!files.length) throw new Error("No changed, non-ignored files are available to commit.");
  event("log", `Staging ${files.length} reviewed non-ignored file(s).`);
  stageReviewedFiles(files);
  event("log", `Creating commit: ${message}`);
  run("git", ["commit", "-m", message]);
  event("log", "Pushing the reviewed commit to its configured upstream.");
  run("git", ["push"]);
  event("result", "Commit and push completed.", { head: git(["rev-parse", "HEAD"]), files });
}

function stageReviewedFiles(files) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      run("git", ["add", "--", ...files]);
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      event("log", `Staging attempt ${attempt} failed; waiting for any concurrent Git index operation to finish.`);
      sleep(350);
    }
  }

  throw new Error(`Unable to stage the reviewed release scope: ${commandFailure(lastError)}`);
}

function syncUpstream() {
  const upstream = gitOptional(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  if (!upstream) {
    event("log", "No upstream is configured; commit and push will rely on Git's configured default.");
    return;
  }

  event("log", `Fetching ${upstream} before staging the reviewed release scope.`);
  run("git", ["fetch", "--prune"]);
  const behind = Number(git(["rev-list", "--count", "HEAD..@{upstream}"])) || 0;
  if (behind === 0) {
    event("log", "Remote analysis complete: the checked-out branch is up to date.");
    return;
  }

  event("log", `Remote analysis found ${behind} incoming commit(s); rebasing before commit.`);
  run("git", ["pull", "--rebase", "--autostash"]);
  event("log", "Remote changes were rebased successfully; re-checking release scope.");
  npm(["run", "release:scope"]);
}

function releaseCommitSubject() {
  const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
  const escaped = String(version).replaceAll(".", "\\.");
  const changelog = readFileSync(resolve(root, "assist", "documentation", "CHANGELOG.md"), "utf8");
  const title = changelog.match(new RegExp(`^### \\[v ${escaped}\\].*? - (.+)$`, "mu"))?.[1]?.trim();
  if (!title) throw new Error(`No release title was found for v ${version}.`);
  return `#${Number(String(version).split(".")[2])} - ${title}`;
}

async function publish() {
  event("log", "Starting the repository-owned release publisher after final approval and waiting for public release verification.");
  await runStreaming(process.execPath, ["tools/github-release.mjs", "--yes"]);
  const version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
  const tag = `desktop-v${version}`;
  event("result", "Release workflow completed and its public assets were verified.", {
    releaseUrl: `https://github.com/CODEXSUN/neot/releases/tag/${tag}`,
    tag,
    workflowUrl: "https://github.com/CODEXSUN/neot/actions/workflows/desktop-release.yml"
  });
}

function npm(args) { run(process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm", process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd", ...args] : args); }
function git(args) { return run("git", args, true); }
function gitOptional(args) { try { return git(args); } catch { return ""; } }
function changedFiles() {
  const output = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return output.split(/\r?\n/u).filter(Boolean).map((line) => line.slice(3).trim()).filter(Boolean);
}
function sleep(milliseconds) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds); }
function commandFailure(error) { const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : ""; return stderr || (error instanceof Error ? error.message : "Unknown command failure."); }
function run(command, args, quiet = false) { const output = execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: quiet ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "pipe"] }); const text = output?.trim() ?? ""; if (!quiet && text) event("log", text); return text; }
function runStreaming(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    streamLines(child.stdout, (line) => event("log", line));
    streamLines(child.stderr, (line) => event("log", `publisher: ${line}`));
    child.once("error", rejectRun);
    child.once("close", (code) => code === 0 ? resolveRun() : rejectRun(new Error(`Repository release publisher exited with code ${code ?? "unknown"}.`)));
  });
}
function streamLines(stream, write) { createInterface({ input: stream }).on("line", (line) => { if (line.trim()) write(line); }); }
function lines(value) { return value.split(/\r?\n/u).filter(Boolean); }
function valueAfter(flag) { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] : undefined; }
function event(type, message, data) { process.stdout.write(`${JSON.stringify({ type, message, ...(data ? { data } : {}) })}\n`); }
