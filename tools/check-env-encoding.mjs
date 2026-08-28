import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".archive",
  "build",
  "dist",
  "dist-types",
  "node_modules"
]);
const mojibakePattern =
  /(?:\u00e2[^\x00-\x7f]|\u00c3.|\u00c2.|\u00ef\u00bb\u00bf|\u00f0\u0178|\uFFFD)/u;
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ps1",
  ".scss",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml"
]);
const isEnvironmentFile = (name) =>
  /^\.env(?:\..+)?$/u.test(name) || /\.env\.(?:example|template)$/u.test(name);
const isTextFile = (name) =>
  isEnvironmentFile(name) ||
  textExtensions.has(path.extname(name).toLowerCase()) ||
  [".editorconfig", ".gitattributes", ".gitignore", "Dockerfile", "LICENSE", "Makefile"].includes(
    name
  );
function hasByteOrderMark(bytes) {
  return (
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ||
    (bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes[0] === 0xfe && bytes[1] === 0xff)
  );
}

async function findEnvironmentFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name))
        files.push(...(await findEnvironmentFiles(path.join(directory, entry.name))));
    } else if (entry.isFile() && isTextFile(entry.name))
      files.push(path.join(directory, entry.name));
  }
  return files;
}
const failures = [];
const files = await findEnvironmentFiles(root);
const decoder = new TextDecoder("utf-8", { fatal: true });
for (const file of files) {
  const relativeFile = path.relative(root, file);
  const bytes = await readFile(file);
  const environmentFile = isEnvironmentFile(path.basename(file));
  let text;
  try {
    text = decoder.decode(bytes);
  } catch {
    failures.push(`${relativeFile}: invalid UTF-8`);
    continue;
  }
  if (environmentFile && hasByteOrderMark(bytes))
    failures.push(`${relativeFile}: UTF-8 BOM is not allowed`);
  text.split(/\r?\n/u).forEach((line, index) => {
    if (mojibakePattern.test(line))
      failures.push(`${relativeFile}:${index + 1}: possible mojibake`);
    if (environmentFile && /^\s*#/u.test(line) && /[^\t\x20-\x7e]/u.test(line))
      failures.push(`${relativeFile}:${index + 1}: comments must use ASCII text`);
  });
}
if (failures.length > 0) {
  console.error("Repository text encoding check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Repository text encoding check passed (${files.length} files).`);
