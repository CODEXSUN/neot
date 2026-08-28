import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { clearTimeout, setInterval, setTimeout } from "node:timers";

const root = resolve(import.meta.dirname, "..");
const runtimeEnv = loadDotEnv();
const apiPort = requiredPort("PLATFORM_API_PORT");
const webPort = requiredPort("PLATFORM_WEB_PORT");
const apiHealthUrl = `http://127.0.0.1:${apiPort}/health`;
const webHealthUrl = `http://127.0.0.1:${webPort}/`;
const healthFailureLimit = 15;
const services = {
  "platform-api": {
    color: "\x1b[36m",
    label: "api",
    preflight: "platform-api",
    readyPattern: /\[server\.listen\]\s+http:\/\/127\.0\.0\.1:\d+/u
  },
  "platform-web": {
    color: "\x1b[32m",
    label: "web",
    preflight: "platform-web",
    readyPattern: /VITE\s+v[^\s]+\s+ready in/u
  }
};
const reset = "\x1b[0m";
const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "gu");
const children = new Set();
let stopping = false;

console.log("\nNEOT Platform runtime");
await startStack();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await stopChildren();
    process.exit(0);
  });
}

function startService(serviceName) {
  const service = services[serviceName];
  let settleReady;
  let rejectReady;
  let observedOutput = "";
  const ready = new Promise((resolveReady, rejectService) => {
    settleReady = resolveReady;
    rejectReady = rejectService;
  });
  const child = spawn(process.execPath, ["tools/preflight.mjs", service.preflight], {
    cwd: root,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  children.add(child);
  const observe = (chunk) => {
    observedOutput = `${observedOutput}${String(chunk)}`.slice(-4_000);
    writeServiceLines(service, chunk);
    if (service.readyPattern.test(observedOutput)) settleReady();
  };
  child.stdout.on("data", observe);
  child.stderr.on("data", observe);
  child.on("exit", async (code) => {
    children.delete(child);
    if (stopping) return;

    const exitCode = code ?? 1;
    rejectReady(new Error(`${service.label} exited before it became ready`));
    console.error(`${service.color}[${service.label}]${reset} exited with code ${exitCode}`);
    await stopChildren(child);
    process.exit(exitCode || 1);
  });

  return { child, ready };
}

async function startStack() {
  console.log(`  - ${services["platform-api"].label}`);
  const api = startService("platform-api");
  await waitForServiceReady(api.ready, "Platform API", 90_000);
  await waitForHealthyUrl(apiHealthUrl, "Platform API", 10_000);

  console.log(`  - ${services["platform-web"].label}`);
  const web = startService("platform-web");
  await waitForServiceReady(web.ready, "Platform Web", 30_000);
  await waitForHealthyUrl(webHealthUrl, "Platform Web", 10_000);
  console.log("  ok Platform API and Web are ready\n");
  monitorStackHealth();
}

async function waitForServiceReady(readiness, label, timeoutMs) {
  let timeout;
  try {
    await Promise.race([
      readiness,
      new Promise((_, rejectWait) => {
        timeout = setTimeout(
          () => rejectWait(new Error(`${label} did not report readiness in time`)),
          timeoutMs
        );
      })
    ]);
  } catch (error) {
    console.error(`  x ${error instanceof Error ? error.message : String(error)}`);
    await stopChildren();
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForHealthyUrl(url, label, timeoutMs) {
  const startedAt = Date.now();
  let lastStatus = "not reachable";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      lastStatus = `HTTP ${response.status}`;
      if (response.ok) return;
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }

  console.error(`  x ${label} did not become healthy: ${lastStatus}`);
  await stopChildren();
  process.exit(1);
}

function monitorStackHealth() {
  const targets = [
    { failures: 0, label: "Platform API", url: apiHealthUrl },
    { failures: 0, label: "Platform Web", url: webHealthUrl }
  ];
  let checking = false;

  setInterval(async () => {
    if (checking || stopping) return;
    checking = true;

    try {
      for (const target of targets) {
        try {
          const response = await fetch(target.url, { signal: AbortSignal.timeout(2_000) });
          target.failures = response.ok ? 0 : target.failures + 1;
        } catch {
          target.failures += 1;
        }

        if (target.failures >= healthFailureLimit) {
          console.error(`  x ${target.label} became unavailable; stopping Platform runtime`);
          await stopChildren();
          process.exit(1);
        }
      }
    } finally {
      checking = false;
    }
  }, 2_000);
}

function loadDotEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return {};
  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/u))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].replace(/^(?:"(.*)"|'(.*)')$/u, "$1$2")])
  );
}

function requiredPort(key) {
  const value = process.env[key] || runtimeEnv[key];
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${key} must be a port between 1 and 65535.`);
  }
  return port;
}

function writeServiceLines(service, chunk) {
  for (const rawLine of String(chunk).split(/\r?\n/u)) {
    const line = rawLine.replace(ansiPattern, "").trim();
    if (line) process.stdout.write(`${service.color}[${service.label}]${reset} ${line}\n`);
  }
}

async function stopChildren(skipChild) {
  stopping = true;
  const activeChildren = [...children].filter(
    (child) => child !== skipChild && !child.killed && child.pid
  );

  for (const child of activeChildren) {
    child.kill("SIGTERM");
  }

  await Promise.all(activeChildren.map((child) => waitForExit(child, 5_000)));

  for (const child of activeChildren) {
    if (child.exitCode !== null || child.signalCode !== null || !child.pid) continue;
    console.warn(`  ! Process ${child.pid} did not stop gracefully; forcing shutdown`);
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGKILL");
    }
  }
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolveWait) => {
    const timeout = setTimeout(resolveWait, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolveWait();
    });
  });
}
