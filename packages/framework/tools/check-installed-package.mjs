import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("npm_execpath is required. Run this check through npm.");
}

const entries = [
  "@neot/framework",
  "@neot/framework/api",
  "@neot/framework/config",
  "@neot/framework/db",
  "@neot/framework/env",
  "@neot/framework/errors",
  "@neot/framework/events",
  "@neot/framework/health",
  "@neot/framework/http",
  "@neot/framework/logger",
  "@neot/framework/modules",
  "@neot/framework/queue",
  "@neot/framework/storage"
];
const directory = await mkdtemp(join(tmpdir(), "codexsun-framework-consumer-"));

try {
  const packed = run(
    process.execPath,
    [npmCli, "pack", "--json", "--pack-destination", directory],
    {
      cwd: process.cwd()
    }
  );
  const report = JSON.parse(packed);
  const filename = (Array.isArray(report) ? report[0] : Object.values(report)[0]).filename;
  const tarball = join(directory, filename);

  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({ name: "framework-consumer-check", private: true, type: "module" }, null, 2)
  );
  run(
    process.execPath,
    [
      npmCli,
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--no-package-lock",
      tarball
    ],
    { cwd: directory }
  );

  const imports = entries
    .map((entry, index) => `import * as entry${index} from ${JSON.stringify(entry)};`)
    .join("\n");
  const uses = entries.map((_, index) => `void entry${index};`).join("\n");
  await writeFile(join(directory, "consumer.ts"), `${imports}\n${uses}\n`);
  await writeFile(
    join(directory, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: "ES2022"
        },
        include: ["consumer.ts"]
      },
      null,
      2
    )
  );

  const typescriptCli = join(process.cwd(), "node_modules", "typescript", "lib", "tsc.js");
  run(process.execPath, [typescriptCli, "-p", "tsconfig.json"], { cwd: directory });
  await writeFile(
    join(directory, "consumer.mjs"),
    `${entries.map((entry) => `await import(${JSON.stringify(entry)});`).join("\n")}\n`
  );
  run(process.execPath, ["consumer.mjs"], { cwd: directory });

  console.info(
    `Installed Framework package check passed: compiled and imported ${entries.length} public entries.`
  );
} finally {
  await rm(directory, { force: true, recursive: true });
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    ...options,
    encoding: "utf8",
    env: process.env
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }
  return result.stdout;
}
