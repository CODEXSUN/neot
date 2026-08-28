#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { WorkflowProgressReporter } from "./github-release-progress.mjs";

const root = resolve(import.meta.dirname, "..");
const repository = "CODEXSUN/neot";
const workflow = "desktop-release.yml";

export class GitHubReleasePublisher {
  constructor(args = process.argv.slice(2)) {
    this.args = args;
    this.version = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;
    this.tag = releaseTag(this.version);
    this.timeoutMinutes = numberOption(args, "--timeout-minutes", 45);
  }

  async run() {
    this.assertArguments();
    const state = this.readState();
    this.printSummary(state);
    if (this.args.includes("--dry-run")) return;

    this.assertReleaseReady(state);
    this.assertTagTargets(state.head);
    const published = await this.readPublishedRelease();
    if (published) {
      this.printPublishedRelease(published, "Release already published");
      return;
    }

    if (!this.args.includes("--yes") && !(await confirmRelease(this.tag, state.head))) {
      throw new Error("Cancelled.");
    }

    this.runChecks();
    const checkedState = this.readState();
    this.assertReleaseReady(checkedState);
    this.ensureTag(checkedState.head);
    if (this.args.includes("--no-wait")) {
      console.log(`Tag pushed. Follow the release at ${actionsUrl()}`);
      return;
    }

    const workflowRun = await this.waitForWorkflow(checkedState.head);
    const release = await this.waitForPublishedRelease();
    this.printPublishedRelease(release, `Workflow ${workflowRun.id} completed`);
  }

  assertArguments() {
    const known = new Set(["--dry-run", "--no-wait", "--timeout-minutes", "--yes"]);
    for (let index = 0; index < this.args.length; index += 1) {
      const argument = this.args[index];
      if (!known.has(argument)) throw new Error(`Unknown argument: ${argument}`);
      if (argument === "--timeout-minutes") index += 1;
    }
  }

  readState() {
    runGit(["fetch", "--quiet", "origin"]);
    const branch = runGit(["branch", "--show-current"], true);
    const upstream = runGit(
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
      true
    );
    return {
      branch,
      changedFiles: splitLines(runGit(["status", "--porcelain"], true)),
      head: runGit(["rev-parse", "HEAD"], true),
      upstream,
      upstreamHead: upstream ? runGit(["rev-parse", upstream], true) : ""
    };
  }

  printSummary(state) {
    console.log("");
    console.log(`NEOT release: ${this.version}`);
    console.log(`Tag:               ${this.tag}`);
    console.log(`Commit:            ${state.head}`);
    console.log(`Branch:            ${state.branch || "detached"}`);
    console.log(`Upstream:          ${state.upstream || "none"}`);
    console.log(`Changed files:     ${state.changedFiles.length}`);
    console.log(`Workflow:          ${actionsUrl()}`);
    console.log("");
    if (this.args.includes("--dry-run")) {
      console.log("Dry run only. No tag or GitHub release was created.");
      console.log("");
    }
  }

  assertReleaseReady(state) {
    if (state.changedFiles.length) throw new Error("Commit all files before release.");
    if (state.branch !== "main") throw new Error("Create a release only from the main branch.");
    if (state.upstream !== "origin/main")
      throw new Error("The main branch must track origin/main.");
    if (state.head !== state.upstreamHead) {
      throw new Error("Push the current main commit before release.");
    }
  }

  runChecks() {
    console.log("Running release checks...");
    runNpm(["run", "check:versions"]);
    runNpm(["run", "dependencies:check"]);
    runNpm(["run", "desktop:check"]);
  }

  ensureTag(head) {
    const localCommit = tagCommit(this.tag);
    const remoteCommit = remoteTagCommit(this.tag);
    this.assertTagTargets(head, localCommit, remoteCommit);
    if (!localCommit) {
      runGit(["tag", "-a", this.tag, head, "-m", `NEOT ${this.version}`]);
      console.log(`Created tag ${this.tag}.`);
    }
    if (!remoteCommit) {
      runGit(["push", "origin", `refs/tags/${this.tag}`]);
      console.log(`Pushed tag ${this.tag}.`);
    } else {
      console.log(`Remote tag ${this.tag} already exists. Resuming release verification.`);
    }
  }

  assertTagTargets(
    head,
    localCommit = tagCommit(this.tag),
    remoteCommit = remoteTagCommit(this.tag)
  ) {
    for (const [label, commit] of [
      ["Local", localCommit],
      ["Remote", remoteCommit]
    ]) {
      if (commit && commit !== head) {
        throw new Error(`${label} tag ${this.tag} points to ${commit}, not ${head}.`);
      }
    }
  }

  async waitForWorkflow(head) {
    const deadline = Date.now() + this.timeoutMinutes * 60_000;
    const reporter = new WorkflowProgressReporter();
    while (Date.now() < deadline) {
      const response = await githubJson(
        `/actions/workflows/${workflow}/runs?event=push&per_page=30`
      );
      const run = response.workflow_runs?.find(
        (candidate) => candidate.head_sha === head && candidate.head_branch === this.tag
      );
      if (run) {
        const jobs = await githubJson(`/actions/runs/${run.id}/jobs?per_page=100`);
        reporter.report(run, jobs);
        if (run.status === "completed" && run.conclusion === "success") return run;
        if (run.status === "completed") {
          throw new Error(`Desktop release workflow failed: ${run.html_url}`);
        }
      }
      await delay(apiPollInterval(15_000, 60_000));
    }
    throw new Error(reporter.timeoutMessage(actionsUrl()));
  }

  async waitForPublishedRelease() {
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const release = await this.readPublishedRelease();
      if (release) return release;
      await delay(apiPollInterval(5_000, 15_000));
    }
    throw new Error(`The workflow passed, but ${this.tag} is not public.`);
  }

  async readPublishedRelease() {
    const release = await githubJson(`/releases/tags/${this.tag}`, true);
    if (!release || release.draft) return undefined;
    assertReleaseAssets(release, this.version);
    return release;
  }

  printPublishedRelease(release, message) {
    console.log(`${message}: ${release.html_url}`);
    console.log(`Verified ${release.assets.length} public release assets.`);
  }
}

export function releaseTag(version) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error(`Invalid release version: ${version}`);
  return `desktop-v${version}`;
}

export function requiredReleaseAssets(version) {
  return [
    `NEOT_${version}_x64_en-US.msi`,
    `NEOT_${version}_x64_en-US.msi.sig`,
    `NEOT_Setup_${version}_x64.exe`,
    "latest.json"
  ];
}

export function assertReleaseAssets(release, version) {
  const names = new Set((release.assets ?? []).map((asset) => asset.name));
  const missing = requiredReleaseAssets(version).filter((name) => !names.has(name));
  if (missing.length) throw new Error(`The public release is missing: ${missing.join(", ")}`);
}

export function npmInvocation(
  args,
  runtimePlatform = platform(),
  commandShell = process.env.ComSpec
) {
  if (runtimePlatform !== "win32") return { command: "npm", args };
  return {
    command: commandShell || "cmd.exe",
    args: ["/d", "/s", "/c", "npm.cmd", ...args]
  };
}

function tagCommit(tag) {
  try {
    return runGit(["rev-list", "-n", "1", tag], true);
  } catch {
    return "";
  }
}

function remoteTagCommit(tag) {
  const output = runGit(
    ["ls-remote", "--tags", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`],
    true
  );
  const lines = splitLines(output);
  return (
    lines.find((line) => line.endsWith("^{}"))?.split(/\s+/u)[0] ?? lines[0]?.split(/\s+/u)[0] ?? ""
  );
}

async function githubJson(path, allowNotFound = false) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "NEOT-release-tool",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, { headers });
  if (allowNotFound && response.status === 404) return undefined;
  if (!response.ok) throw new Error(`GitHub API returned ${response.status} for ${path}.`);
  return response.json();
}

async function confirmRelease(tag, head) {
  const question = `Create ${tag} at ${head.slice(0, 12)} and publish after all checks pass? [y/N]: `;
  if (!process.stdin.isTTY && platform() === "win32") return isYes(askWindowsModal(question));
  if (!process.stdin.isTTY)
    throw new Error("Interactive input is required. Use --yes after --dry-run.");
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await new Promise((resolveAnswer) =>
      readline.question(question, (value) => resolveAnswer(isYes(value)))
    );
  } finally {
    readline.close();
  }
}

function askWindowsModal(question) {
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    `$result = [System.Windows.Forms.MessageBox]::Show(${quotePowerShell(question.replace(/\s*\[y\/N\]:\s*$/iu, ""))}, 'GitHub Release Review', 'YesNo', 'Warning')`,
    "if ($result -eq 'Yes') { 'yes' } else { 'no' }"
  ].join("; ");
  return execFileSync("powershell.exe", ["-NoProfile", "-STA", "-Command", script], {
    encoding: "utf8",
    windowsHide: false
  }).trim();
}

function runGit(args, silent = false) {
  return (
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: silent ? ["ignore", "pipe", "pipe"] : "inherit"
    })?.trim() ?? ""
  );
}

function runNpm(args) {
  const invocation = npmInvocation(args);
  execFileSync(invocation.command, invocation.args, { cwd: root, stdio: "inherit" });
}

function numberOption(args, name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 5 || value > 120) {
    throw new Error(`${name} must be an integer from 5 to 120.`);
  }
  return value;
}

function actionsUrl() {
  return `https://github.com/${repository}/actions/workflows/${workflow}`;
}

function splitLines(value) {
  return value.split(/\r?\n/u).filter(Boolean);
}

function quotePowerShell(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function isYes(value) {
  return ["y", "yes"].includes(value.trim().toLowerCase());
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function apiPollInterval(authenticated, unauthenticated) {
  return process.env.GITHUB_TOKEN ? authenticated : unauthenticated;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  Promise.resolve()
    .then(() => new GitHubReleasePublisher().run())
    .catch((error) => {
      console.error(`Release failed: ${error.message}`);
      process.exitCode = 1;
    });
}
