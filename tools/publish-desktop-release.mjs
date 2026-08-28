#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = packageJson.version;
const targetRoot = join(root, "apps", "neot", "desktop", "src-tauri", "target", "release");
const bundleRoot = join(targetRoot, "bundle", "msi");
const deployBase = join(root, "dist", "deploy", "desktop");
const deployRoot = join(deployBase, version, "windows-x64");
const installerName = `NEOT_${version}_x64_en-US.msi`;
const setupName = `NEOT_Setup_${version}_x64.exe`;

await publishDesktopRelease();

async function publishDesktopRelease() {
  clearDeployRoot();
  const installerPath = join("installer", installerName);
  const setupPath = join("installer", setupName);
  const files = [
    copyArtifact(join(targetRoot, "NEOT.exe"), join("app", "NEOT.exe"), "app"),
    copyArtifact(join(targetRoot, "codex.exe"), join("app", "codex.exe"), "agent-runtime"),
    copyArtifact(
      join(targetRoot, "codex-code-mode-host.exe"),
      join("app", "codex-code-mode-host.exe"),
      "agent-tool-runtime",
    ),
    copyArtifact(
      join(targetRoot, "codex-command-runner.exe"),
      join("app", "codex-command-runner.exe"),
      "agent-sandbox-runner",
    ),
    copyArtifact(
      join(targetRoot, "codex-windows-sandbox-setup.exe"),
      join("app", "codex-windows-sandbox-setup.exe"),
      "agent-sandbox-setup",
    ),
    copyArtifact(join(targetRoot, "rg.exe"), join("app", "rg.exe"), "agent-search-runtime"),
    copyArtifact(join(bundleRoot, installerName), installerPath, "installer"),
    copyArtifact(
      join(bundleRoot, `${installerName}.sig`),
      join("installer", `${installerName}.sig`),
      "updater-signature"
    )
  ];
  buildSetupLauncher(join(deployRoot, installerPath), join(deployRoot, setupPath));
  files.push(describeArtifact(setupPath, "first-install-launcher"));
  writeUpdaterManifest(installerName);
  files.push(describeArtifact(join("updater", "latest.json"), "updater-manifest"));
  const described = await Promise.all(files);
  writeChecksums(described);
  writeReleaseManifest(described);
  console.log(`Published desktop release outputs to ${deployRoot}`);
}

function buildSetupLauncher(installerPath, outputPath) {
  const source = join(root, "tools", "desktop-installer-launcher.rs");
  const resourceSource = join(deployRoot, "setup-launcher.rc");
  const resourceOutput = join(deployRoot, "setup-launcher.res");
  writeSetupResource(resourceSource);

  try {
    execFileSync(findResourceCompiler(), ["/nologo", `/fo${resourceOutput}`, resourceSource], {
      stdio: "inherit"
    });
    execFileSync(
      "rustc",
      [
        "--edition",
        "2021",
        "-C",
        "opt-level=z",
        "-C",
        "strip=symbols",
        "-C",
        "panic=abort",
        "-C",
        `link-arg=${resourceOutput}`,
        "-o",
        outputPath,
        source
      ],
      {
        env: {
          ...process.env,
          NEOT_MSI_PATH: installerPath,
          NEOT_VERSION: version
        },
        stdio: "inherit"
      }
    );
  } finally {
    rmSync(resourceSource, { force: true });
    rmSync(resourceOutput, { force: true });
    rmSync(outputPath.replace(/\.exe$/u, ".pdb"), { force: true });
  }
}

function writeSetupResource(outputPath) {
  const [major, minor, patch] = version.split(".");
  const icon = join(root, "apps", "neot", "desktop", "src-tauri", "icons", "icon.ico")
    .replaceAll("\\", "\\\\");
  const content = `1 ICON "${icon}"
1 VERSIONINFO
FILEVERSION ${major},${minor},${patch},0
PRODUCTVERSION ${major},${minor},${patch},0
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "040904E4"
    BEGIN
      VALUE "CompanyName", "CODEXSUN\\0"
      VALUE "FileDescription", "NEOT Setup\\0"
      VALUE "FileVersion", "${version}\\0"
      VALUE "InternalName", "NEOT Setup\\0"
      VALUE "OriginalFilename", "${setupName}\\0"
      VALUE "ProductName", "NEOT\\0"
      VALUE "ProductVersion", "${version}\\0"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x0409, 1252
  END
END
`;
  writeFileSync(outputPath, content);
}

function findResourceCompiler() {
  const programFiles = process.env["ProgramFiles(x86)"];
  if (!programFiles) throw new Error("The Windows Program Files path is unavailable.");
  const binRoot = join(programFiles, "Windows Kits", "10", "bin");
  const versions = readdirSync(binRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+\.\d+/u.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
  for (const sdkVersion of versions) {
    const candidate = join(binRoot, sdkVersion, "x64", "rc.exe");
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("The Windows x64 resource compiler is unavailable.");
}

function clearDeployRoot() {
  const expectedPrefix = `${resolve(deployBase)}${sep}`;
  if (!resolve(deployRoot).startsWith(expectedPrefix)) {
    throw new Error(`Refusing to clear an unexpected release path: ${deployRoot}`);
  }
  rmSync(deployRoot, { force: true, recursive: true });
  mkdirSync(deployRoot, { recursive: true });
}

function copyArtifact(source, destination, role) {
  if (!existsSync(source)) {
    throw new Error(`Required desktop release output is missing: ${source}`);
  }
  const output = join(deployRoot, destination);
  mkdirSync(resolve(output, ".."), { recursive: true });
  copyFileSync(source, output);
  return describeArtifact(destination, role);
}

function writeUpdaterManifest(installerName) {
  const signature = readFileSync(join(bundleRoot, `${installerName}.sig`), "utf8").trim();
  const tag = `desktop-v${version}`;
  const url = `https://github.com/CODEXSUN/neot/releases/download/${tag}/${installerName}`;
  const manifest = {
    version,
    notes: `NEOT ${version}`,
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": { signature, url }
    }
  };
  const output = join(deployRoot, "updater", "latest.json");
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function describeArtifact(path, role) {
  const fullPath = join(deployRoot, path);
  return {
    path: path.replaceAll("\\", "/"),
    role,
    bytes: statSync(fullPath).size,
    sha256: await sha256(fullPath)
  };
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function writeChecksums(files) {
  const content = files.map((file) => `${file.sha256}  ${file.path}`).join("\n");
  writeFileSync(join(deployRoot, "checksums.sha256"), `${content}\n`);
}

function writeReleaseManifest(files) {
  const manifest = {
    product: "NEOT",
    version,
    platform: "windows",
    architecture: "x86_64",
    generatedAt: new Date().toISOString(),
    root: relative(root, deployRoot).replaceAll("\\", "/"),
    files
  };
  writeFileSync(join(deployRoot, "release.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}
