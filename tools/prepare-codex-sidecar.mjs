import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.env.TAURI_ENV_TARGET_TRIPLE ?? detectTargetTriple();
const packageName = packageForTarget(target);
const executableSuffix = process.platform === "win32" ? ".exe" : "";
const binaries = [
  { name: "codex", sourceDirectory: "bin" },
  { name: "codex-code-mode-host", sourceDirectory: "bin" },
  { name: "codex-command-runner", sourceDirectory: "codex-resources" },
  { name: "codex-windows-sandbox-setup", sourceDirectory: "codex-resources" },
  { name: "rg", sourceDirectory: "codex-path" }
];

for (const binary of binaries) {
  copyBinary(binary.name, binary.sourceDirectory);
}

copyOpenCodeBinary();

console.log(`Prepared Codex ${target} sidecars.`);

function copyOpenCodeBinary() {
  const source = resolve(repositoryRoot, "node_modules", "opencode-ai", "bin", "opencode.exe");
  const destination = resolve(
    repositoryRoot,
    "apps/neot/desktop/src-tauri/binaries",
    `opencode-${target}${executableSuffix}`
  );
  if (!existsSync(source) || statSync(source).size < 1_000_000) {
    throw new Error("OpenCode CLI is unavailable. Run npm install from the repository root.");
  }
  mkdirSync(dirname(destination), { recursive: true });
  if (!existsSync(destination) || statSync(destination).size !== statSync(source).size) {
    copyFileSync(source, destination);
  }
}

function copyBinary(binary, sourceDirectory) {
  const source = resolve(
    repositoryRoot,
    "node_modules",
    "@openai",
    packageName,
    "vendor",
    target,
    sourceDirectory,
    `${binary}${executableSuffix}`
  );
  const destination = resolve(
    repositoryRoot,
    "apps/neot/desktop/src-tauri/binaries",
    `${binary}-${target}${executableSuffix}`
  );

  if (!existsSync(source)) {
    if (!process.env.CI && existsSync(destination) && statSync(destination).size > 0) {
      console.warn(
        `Using the existing ${binary} sidecar for ${target}; run npm install from the repository root to restore its vendor source.`
      );
      return;
    }

    throw new Error(
      `${binary} is unavailable for ${target}. Run npm install from the repository root.`
    );
  }

  mkdirSync(dirname(destination), { recursive: true });
  if (!existsSync(destination) || statSync(destination).size !== statSync(source).size) {
    copyFileSync(source, destination);
  }
}

function detectTargetTriple() {
  const targets = {
    "darwin-arm64": "aarch64-apple-darwin",
    "darwin-x64": "x86_64-apple-darwin",
    "linux-arm64": "aarch64-unknown-linux-musl",
    "linux-x64": "x86_64-unknown-linux-musl",
    "win32-arm64": "aarch64-pc-windows-msvc",
    "win32-x64": "x86_64-pc-windows-msvc"
  };
  const targetTriple = targets[`${process.platform}-${process.arch}`];
  if (!targetTriple) {
    throw new Error(`Unsupported NEOT target: ${process.platform}-${process.arch}`);
  }
  return targetTriple;
}

function packageForTarget(targetTriple) {
  const packages = {
    "aarch64-apple-darwin": "codex-darwin-arm64",
    "aarch64-pc-windows-msvc": "codex-win32-arm64",
    "aarch64-unknown-linux-musl": "codex-linux-arm64",
    "x86_64-apple-darwin": "codex-darwin-x64",
    "x86_64-pc-windows-msvc": "codex-win32-x64",
    "x86_64-unknown-linux-musl": "codex-linux-x64"
  };
  const packageName = packages[targetTriple];
  if (!packageName) {
    throw new Error(`Unsupported Codex target triple: ${targetTriple}`);
  }
  return packageName;
}
