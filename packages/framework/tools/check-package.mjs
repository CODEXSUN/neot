import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const packageRoot = resolve(root, "packages/framework");
const runtimeRoot = resolve(root, "dist/packages/framework");
const entries = [
  "index",
  "api",
  "config",
  "db",
  "env",
  "errors",
  "events",
  "health",
  "http",
  "logger",
  "modules",
  "queue",
  "storage"
];
const missingFiles = [];

for (const entry of entries) {
  const runtimePath = resolve(runtimeRoot, entry === "index" ? "index.js" : `${entry}/index.js`);
  const proxyPath = resolve(packageRoot, `${entry}.js`);
  const expectedReference =
    entry === "index"
      ? "../../dist/packages/framework/index.js"
      : `../../dist/packages/framework/${entry}/index.js`;

  if (!existsSync(runtimePath)) {
    missingFiles.push(runtimePath);
  }
  if (!existsSync(proxyPath) || !readFileSync(proxyPath, "utf8").includes(expectedReference)) {
    missingFiles.push(proxyPath);
  }
}

if (missingFiles.length > 0) {
  throw new Error(`Framework workspace runtime is incomplete: ${missingFiles.join(", ")}`);
}

console.info(`Framework workspace check passed for ${entries.length} root-dist runtime entries.`);
