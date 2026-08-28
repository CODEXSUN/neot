#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";

const root = resolve(import.meta.dirname, "..");
const changelogPath = join(root, "assist", "documentation", "CHANGELOG.md");
const tauriConfigPath = join(root, "apps", "neot", "desktop", "src-tauri", "tauri.conf.json");
const cargoManifestPath = join(root, "apps", "neot", "desktop", "src-tauri", "Cargo.toml");
const cargoLockPath = join(root, "apps", "neot", "desktop", "src-tauri", "Cargo.lock");
const command = process.argv[2];
const args = process.argv.slice(3);

if (
  !command ||
  !["version:show", "version:bump", "check:versions", "github:now"].includes(command)
) {
  console.error(
    "Usage: node tools/repository-release.mjs <version:show|version:bump|check:versions|github:now>"
  );
  process.exit(1);
}

if (command === "version:show") showVersion();
if (command === "version:bump") bumpVersion();
if (command === "check:versions") checkVersions();
if (command === "github:now") await githubNow();

function packageFiles() {
  const rootPackagePath = join(root, "package.json");
  const rootPackage = readJson(rootPackagePath);
  const files = new Set([rootPackagePath]);

  for (const pattern of rootPackage.workspaces ?? []) {
    for (const directory of expandWorkspacePattern(pattern)) {
      const packagePath = join(directory, "package.json");
      if (existsSync(packagePath)) files.add(packagePath);
    }
  }

  return [...files].sort();
}

function expandWorkspacePattern(pattern) {
  let directories = [root];
  for (const part of pattern.split(/[\\/]/u).filter(Boolean)) {
    const next = [];
    for (const directory of directories) {
      if (part === "*") {
        if (!existsSync(directory)) continue;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          if (entry.isDirectory()) next.push(join(directory, entry.name));
        }
      } else {
        const candidate = join(directory, part);
        if (existsSync(candidate) && statSync(candidate).isDirectory()) next.push(candidate);
      }
    }
    directories = next;
  }
  return directories;
}

function showVersion() {
  console.log(`${readJson(join(root, "package.json")).name} ${rootVersion()}`);
}

function bumpVersion() {
  const currentVersion = rootVersion();
  const nextVersion = nextPatch(currentVersion);
  const title = option("--title") ?? "Version update";
  const databaseUpdate = databaseUpdateMode();

  if (args.includes("--dry-run")) {
    console.log(`Version bump dry run: ${currentVersion} -> ${nextVersion}`);
    console.log(`Title: ${title}`);
    console.log(`Database update: ${databaseUpdate ? "Yes" : "No"}`);
    return;
  }

  applyVersionBump(currentVersion, nextVersion, title, databaseUpdate);

  console.log(`Bumped ${currentVersion} -> ${nextVersion}`);
  console.log(`Database update: ${databaseUpdate ? "Yes" : "No"}`);
}

function checkVersions() {
  const expected = rootVersion();
  const failures = [];

  for (const file of packageFiles()) {
    const manifest = readJson(file);
    const actual = String(manifest.version ?? "");
    if (actual !== expected) {
      failures.push(`${relative(root, file)} is ${actual}; expected ${expected}.`);
    }
    checkInternalDependencyVersions(failures, file, manifest, expected);
  }

  if (existsSync(tauriConfigPath)) {
    checkOwnedVersion(failures, tauriConfigPath, readJson(tauriConfigPath).version, expected);
  }
  if (existsSync(cargoManifestPath)) {
    checkOwnedVersion(
      failures,
      cargoManifestPath,
      rustPackageVersion(readFileSync(cargoManifestPath, "utf8"), "neot-desktop"),
      expected
    );
  }
  if (existsSync(cargoLockPath)) {
    checkOwnedVersion(
      failures,
      cargoLockPath,
      rustPackageVersion(readFileSync(cargoLockPath, "utf8"), "neot-desktop"),
      expected
    );
  }

  const lockPath = join(root, "package-lock.json");
  if (existsSync(lockPath)) {
    const lock = readJson(lockPath);
    if (String(lock.version ?? "") !== expected) {
      failures.push(`package-lock.json is ${lock.version}; expected ${expected}.`);
    }
    if (lock.packages?.[""]?.version && String(lock.packages[""].version) !== expected) {
      failures.push(`package-lock root is ${lock.packages[""].version}; expected ${expected}.`);
    }
    checkWorkspaceLockDependencies(failures, lock);
  }

  const changelog = readFileSync(changelogPath, "utf8");
  for (const expectedLine of [
    `Current version: ${expected}`,
    `Release tag: v-${expected}`,
    `Changelog label: v ${expected}`,
    `## v-${expected}`
  ]) {
    if (!changelog.includes(expectedLine)) failures.push(`Changelog is missing: ${expectedLine}`);
  }
  validateLatestChangelogEntry(failures, changelog, expected);

  if (failures.length) {
    console.error(`Version check failed for ${expected}:`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Version check passed for ${expected}.`);
}

async function githubNow() {
  const dryRun = args.includes("--dry-run");
  const allowMutation = args.includes("--yes");
  const currentVersion = rootVersion();
  const proposedVersion = nextPatch(currentVersion);
  const currentEntry = latestEntry(currentVersion);
  const defaultTitle = option("--title") ?? "Version update";
  let version = currentVersion;
  let subject = option("--message");
  let shouldBump = !args.includes("--no-bump");
  let title = defaultTitle;
  let files = changedFiles();

  console.log(`Repository: ${readJson(join(root, "package.json")).name}`);
  console.log(`Version:    ${currentVersion}`);
  console.log(`Next patch: ${proposedVersion}`);
  console.log(`Changes:    ${files.length}`);
  files.forEach((file) => console.log(`  ${file}`));

  if (dryRun) {
    const previewSubject =
      subject ??
      (shouldBump
        ? `#${String(reference(proposedVersion)).padStart(2, "0")} - ${defaultTitle}`
        : `#${String(reference(currentVersion)).padStart(2, "0")} - ${currentEntry.title}`);
    console.log(`Version bump: ${shouldBump ? `${currentVersion} -> ${proposedVersion}` : "No"}`);
    if (shouldBump) console.log(`Title:        ${defaultTitle}`);
    console.log(`Subject:      ${previewSubject}`);
    console.log("Dry run only. No version bump, pull, add, commit, or push was performed.");
    return;
  }

  if (!allowMutation) {
    await withPrompt(async (ask) => {
      const bumpAnswer = await ask(
        `Bump version ${currentVersion} -> ${proposedVersion}? [Y/n] `,
        "yes"
      );
      shouldBump = isYes(bumpAnswer);
      if (shouldBump) {
        title =
          (await ask(`Version title [${defaultTitle}]: `, defaultTitle)).trim() || defaultTitle;
      }
    });
  }

  if (shouldBump) {
    applyVersionBump(currentVersion, proposedVersion, title, databaseUpdateMode());
    version = proposedVersion;
    subject = subject ?? `#${String(reference(version)).padStart(2, "0")} - ${title}`;
    console.log(`Bumped ${currentVersion} -> ${version}`);
  } else {
    subject =
      subject ?? `#${String(reference(currentVersion)).padStart(2, "0")} - ${currentEntry.title}`;
  }

  if (!/^#\d{2,}\s+-\s+\S/u.test(subject)) {
    throw new Error('Commit subject must use "#00 - message" format.');
  }

  files = changedFiles();
  console.log(`Subject: ${subject}`);
  console.log(`Files:   ${files.length}`);

  if (
    !allowMutation &&
    !(await withPrompt((ask) =>
      ask("Continue with pull, stage, commit, and push? [y/N] ", "no").then(isYes)
    ))
  ) {
    throw new Error("Cancelled.");
  }

  const upstream = gitQuiet(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
  if (upstream) {
    git(["fetch", "--quiet"]);
    const behind = Number(gitQuiet(["rev-list", "--count", `HEAD..${upstream}`]) || 0);
    if (behind > 0) git(["pull", "--rebase", "--autostash"]);
    else console.log("Already up to date.");
  } else {
    console.log("No upstream branch found; skipping pull.");
  }

  git(["add", "-A"]);
  const staged = git(["diff", "--cached", "--name-only"], true);
  if (staged) git(["commit", "-m", subject]);
  else console.log("No staged changes; skipping commit.");
  git(["push"]);
}

function applyVersionBump(currentVersion, nextVersion, title, databaseUpdate) {
  for (const file of packageFiles()) updatePackage(file, currentVersion, nextVersion);
  updateLockfile(currentVersion, nextVersion);
  updateDesktopVersions(currentVersion, nextVersion);
  updateChangelog(nextVersion, title, databaseUpdate);
}

function checkOwnedVersion(failures, file, actual, expected) {
  if (String(actual ?? "") !== expected) {
    failures.push(`${relative(root, file)} is ${actual ?? "missing"}; expected ${expected}.`);
  }
}

function updateDesktopVersions(currentVersion, nextVersion) {
  if (existsSync(tauriConfigPath)) {
    const config = readJson(tauriConfigPath);
    if (config.version !== currentVersion) {
      throw new Error(`Tauri version is ${config.version}; expected ${currentVersion}.`);
    }
    config.version = nextVersion;
    writeJson(tauriConfigPath, config);
  }
  updateRustPackageVersion(cargoManifestPath, "neot-desktop", currentVersion, nextVersion);
  updateRustPackageVersion(cargoLockPath, "neot-desktop", currentVersion, nextVersion);
}

function rustPackageVersion(content, packageName) {
  const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return content.match(
    new RegExp(
      `(?:^|\\n)(?:\\[\\[?package\\]?\\]\\r?\\n)name = "${escapedName}"\\r?\\nversion = "([^"]+)"`,
      "u"
    )
  )?.[1];
}

function updateRustPackageVersion(file, packageName, currentVersion, nextVersion) {
  if (!existsSync(file)) return;
  const content = readFileSync(file, "utf8");
  const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(
    `((?:^|\\n)(?:\\[\\[?package\\]?\\]\\r?\\n)name = "${escapedName}"\\r?\\nversion = ")${currentVersion.replaceAll(".", "\\.")}(")`,
    "u"
  );
  const match = content.match(pattern);
  if (!match)
    throw new Error(`${relative(root, file)} does not contain ${packageName} ${currentVersion}.`);
  writeFileSync(file, content.replace(pattern, `$1${nextVersion}$2`), "utf8");
}

function changedFiles() {
  const status = git(["status", "--porcelain"], true);
  return status ? status.split(/\r?\n/u).filter(Boolean) : [];
}

function rootVersion() {
  const version = String(readJson(join(root, "package.json")).version ?? "");
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error(`Invalid package version: ${version}`);
  return version;
}

function nextPatch(version) {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major}.${minor}.${patch + 1}`;
}

function reference(version) {
  return Number(version.split(".")[2]);
}

function updatePackage(file, currentVersion, nextVersion) {
  const pkg = readJson(file);
  pkg.version = nextVersion;
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies"
  ]) {
    for (const [name, value] of Object.entries(pkg[field] ?? {})) {
      if (!isVersionedInternalDependency(name, value)) continue;
      pkg[field][name] = value.startsWith("^") ? `^${nextVersion}` : nextVersion;
    }
  }
  writeJson(file, pkg);
}

function updateLockfile(currentVersion, nextVersion) {
  const file = join(root, "package-lock.json");
  if (!existsSync(file)) return;
  const lock = readJson(file);
  if (lock.version === currentVersion) lock.version = nextVersion;

  const workspacePaths = new Set(
    packageFiles().map((file) => relative(root, dirname(file)).replaceAll("\\", "/"))
  );
  for (const [lockPath, pkg] of Object.entries(lock.packages ?? {})) {
    if (
      pkg &&
      typeof pkg === "object" &&
      pkg.version === currentVersion &&
      (lockPath === "" || workspacePaths.has(lockPath))
    ) {
      pkg.version = nextVersion;
    }
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies"
    ]) {
      for (const [name, value] of Object.entries(pkg?.[field] ?? {})) {
        if (!isVersionedInternalDependency(name, value)) continue;
        pkg[field][name] = value.startsWith("^") ? `^${nextVersion}` : nextVersion;
      }
    }
  }
  writeJson(file, lock);
}

function checkWorkspaceLockDependencies(failures, lock) {
  for (const file of packageFiles()) {
    const lockPath = relative(root, dirname(file)).replaceAll("\\", "/");
    const manifest = readJson(file);
    const locked = lock.packages?.[lockPath === "." ? "" : lockPath];
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies"
    ]) {
      for (const [name, value] of Object.entries(manifest[field] ?? {})) {
        if (!name.startsWith("@neot/") && !name.startsWith("@neot/")) continue;
        if (locked?.[field]?.[name] !== value) {
          failures.push(
            `package-lock ${lockPath} ${name} is ${locked?.[field]?.[name] ?? "missing"}; expected ${value}.`
          );
        }
      }
    }
  }
}

function checkInternalDependencyVersions(failures, file, manifest, expected) {
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies"
  ]) {
    for (const [name, value] of Object.entries(manifest[field] ?? {})) {
      if (!isVersionedInternalDependency(name, value)) continue;
      const expectedValue = value.startsWith("^") ? `^${expected}` : expected;
      if (value !== expectedValue) {
        failures.push(
          `${relative(root, file)} ${name} is ${value}; expected ${expectedValue}.`
        );
      }
    }
  }
}

function isVersionedInternalDependency(name, value) {
  return (
    (name.startsWith("@neot/") || name.startsWith("@neot/")) &&
    /^\^?\d+\.\d+\.\d+$/u.test(value)
  );
}

function updateChangelog(nextVersion, title, databaseUpdate) {
  let changelog = readFileSync(changelogPath, "utf8")
    .replace(/Current version: .*/u, `Current version: ${nextVersion}`)
    .replace(/Release tag: .*/u, `Release tag: v-${nextVersion}`)
    .replace(/Changelog label: .*/u, `Changelog label: v ${nextVersion}`);

  const entry = [
    `## v-${nextVersion}`,
    "",
    `### [v ${nextVersion}] ${timestamp()} - ${title}`,
    "",
    "#### Database Changes",
    "",
    `- Database update: ${databaseUpdate ? "Yes" : "No"}.`,
    "",
    "#### App Codebase Changes",
    "",
    `- Bumped repository version to ${nextVersion}.`,
    "",
    "#### Verification",
    "",
    "- Not yet run. Add the exact commands and live checks before commit.",
    ""
  ].join("\n");
  const index = changelog.indexOf("## v-");
  const insertAt = index < 0 ? changelog.length : index;
  changelog = `${changelog.slice(0, insertAt)}${entry}\n${changelog.slice(insertAt)}`;
  writeFileSync(changelogPath, changelog, "utf8");
}

function validateLatestChangelogEntry(failures, changelog, version) {
  const escaped = version.replaceAll(".", "\\.");
  const entry = changelog.match(
    new RegExp(`^## v-${escaped}\\r?\\n([\\s\\S]*?)(?=^## v-|(?![\\s\\S]))`, "mu")
  )?.[1];
  if (!entry) {
    failures.push(`Changelog entry for v-${version} is missing.`);
    return;
  }

  const sections = ["Database Changes", "App Codebase Changes", "Verification"];
  for (const section of sections) {
    if (!new RegExp(`^#### ${section}\\r?\\n\\r?\\n- .+`, "mu").test(entry)) {
      failures.push(`Changelog v-${version} needs a non-empty ${section} section.`);
    }
  }

  if (/^- Database update: Yes\.$/mu.test(entry)) {
    const databaseBody = entry.match(
      /^#### Database Changes\r?\n\r?\n([\s\S]*?)(?=^#### |(?![\s\S]))/mu
    )?.[1] ?? "";
    const detailCount = databaseBody
      .split(/\r?\n/u)
      .filter((line) => line.startsWith("- ") && !line.startsWith("- Database update:")).length;
    if (!detailCount) {
      failures.push(`Changelog v-${version} says Database update: Yes but lists no schema or data detail.`);
    }
  }
}

function databaseUpdateMode() {
  if (args.includes("--database-update")) return true;
  if (args.includes("--no-database-update")) return false;
  const changed = gitQuiet(["diff", "--name-only", "HEAD", "--"]);
  return changed
    .split(/\r?\n/u)
    .filter(Boolean)
    .some((file) =>
      /(?:migration|database|schema|seed)/u.test(file.replaceAll("\\", "/").toLowerCase())
    );
}

function latestEntry(version) {
  const changelog = readFileSync(changelogPath, "utf8");
  const escaped = version.replaceAll(".", "\\.");
  const match = changelog.match(
    new RegExp(
      `^### \\[v\\s+${escaped}\\](?:\\s+\\d{4}-\\d{2}-\\d{2}(?:\\s+(?:[1-9]|1[0-2]):[0-5]\\d\\s+(?:am|pm))?)?\\s+-\\s+(.+)$`,
      "mu"
    )
  );
  if (!match?.[1]) throw new Error(`No changelog entry found for v ${version}.`);
  return { title: match[1].trim() };
}

function timestamp() {
  const date = new Date();
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  })
    .format(date)
    .toLowerCase();
  return `${datePart} ${timePart}`;
}

function option(name) {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function git(gitArgs, silent = false) {
  return (
    execFileSync("git", gitArgs, {
      cwd: root,
      encoding: "utf8",
      stdio: silent ? ["ignore", "pipe", "inherit"] : "inherit"
    })?.trim() ?? ""
  );
}

function gitQuiet(gitArgs) {
  try {
    return git(gitArgs, true);
  } catch {
    return "";
  }
}

async function withPrompt(callback) {
  if (!process.stdin.isTTY && platform() === "win32") {
    return callback(askWindowsModal);
  }
  if (!process.stdin.isTTY) {
    throw new Error("Interactive terminal required; pass --yes only after reviewing --dry-run.");
  }
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await callback((question, defaultValue = "") => {
      return new Promise((resolveAnswer) => {
        readline.question(question, (answer) => resolveAnswer(answer || defaultValue));
      });
    });
  } finally {
    readline.close();
  }
}

function askWindowsModal(question, defaultValue = "") {
  const confirmation = /\[[Yy]\/[Nn]\]\s*$/u.test(question);
  if (confirmation) {
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      `$answer = [System.Windows.Forms.MessageBox]::Show(${quotePowerShell(
        question.replace(/\s*\[[Yy]\/[Nn]\]\s*$/u, "")
      )}, 'NEOT GitHub Release', 'YesNo', 'Question')`,
      "if ($answer -eq 'Yes') { 'yes' } else { 'no' }"
    ].join("; ");
    return powershellModal(script);
  }

  const script = [
    "Add-Type -AssemblyName Microsoft.VisualBasic",
    `[Microsoft.VisualBasic.Interaction]::InputBox(${quotePowerShell(
      question
    )}, 'NEOT GitHub Release', ${quotePowerShell(defaultValue)})`
  ].join("; ");
  return powershellModal(script);
}

function powershellModal(script) {
  return execFileSync("powershell.exe", ["-NoProfile", "-STA", "-Command", script], {
    encoding: "utf8",
    windowsHide: false
  }).trim();
}

function quotePowerShell(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function isYes(value) {
  return ["y", "yes"].includes(value.trim().toLowerCase());
}
