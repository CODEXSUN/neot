import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");

function resolveOpencode() {
  if (process.env.OPENCODE_EXECUTABLE?.trim()) {
    const path = process.env.OPENCODE_EXECUTABLE.trim();
    assert.ok(existsSync(path), `OPENCODE_EXECUTABLE not found: ${path}`);
    return path;
  }
  const candidates = [
    join(root, "node_modules", "opencode-ai", "bin", "opencode.exe"),
    join(root, "node_modules", "opencode-ai", "bin", "opencode"),
    process.env.PATH ? findOnPath(["opencode.exe", "opencode.cmd"]) : null,
  ].filter(Boolean);
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  assert.ok(found, "opencode executable not found. Install opencode-ai or set OPENCODE_EXECUTABLE.");
  return found;
}

function findOnPath(names) {
  const dirs = (process.env.PATH || "").split(delimiter);
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function runOpencode(executable, model, cwd, prompt) {
  return new Promise((resolvePromise, reject) => {
  const child = spawn(executable, ["run", "--model", model, "--dir", cwd, "--format", "json", prompt], {
      cwd: root,
    windowsHide: true,
    shell: executable.toLowerCase().endsWith(".cmd"),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), 180_000);
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(`exit ${code}: ${stderr.trim() || stdout.slice(-500)}`));
    });
  });
}

function collectText(jsonOutput) {
  const texts = [];
  for (const line of jsonOutput.split("\n")) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "text" && event.part?.text) texts.push(event.part.text);
    } catch {
      // ignore non-JSON progress lines
    }
  }
  return texts.join("");
}

const model = process.env.CODEIT_CHAT_MODEL || "opencode/deepseek-v4-flash-free";
const executable = resolveOpencode();

console.info(`CodeIt live chat test: ${executable}`);
console.info(`Model: ${model}`);

const first = await runOpencode(
  executable,
  model,
  root,
  "You are CodeIt AI. Reply with exactly: LIVE-CHAT-OK"
);
const firstText = collectText(first);
assert.ok(firstText.includes("LIVE-CHAT-OK"), `Unexpected first reply: ${firstText}`);

const code = await runOpencode(
  executable,
  model,
  root,
  "Reply with a one-line JavaScript function named codeitHello that returns 'hello'."
);
const codeText = collectText(code);
assert.ok(codeText.includes("codeitHello"), `Model did not produce requested code: ${codeText}`);

console.info("CodeIt live chat passed: real OpenCode responses verified end-to-end.");
