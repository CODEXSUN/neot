import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import dotenv from "dotenv";
import type { z } from "zod";

export function loadEnv<TSchema extends z.ZodTypeAny>(schema: TSchema): z.infer<TSchema> {
  const envPath = loadNearestEnvFile();
  if (!envPath && process.env.CODEXSUN_ALLOW_MISSING_ENV !== "1") {
    showMissingEnvBanner();
  }

  const result = schema.safeParse(process.env);
  if (!result.success) {
    showInvalidEnvBanner();
    throw result.error;
  }

  return result.data;
}

function loadNearestEnvFile() {
  const envPath = findNearestEnvFile(process.cwd());

  if (envPath) {
    dotenv.config({ path: envPath, quiet: true });
  }

  return envPath;
}

function findNearestEnvFile(startPath: string) {
  let currentPath = resolve(startPath);
  const rootPath = parse(currentPath).root;

  while (true) {
    const envPath = join(currentPath, ".env");

    if (existsSync(envPath)) {
      return envPath;
    }

    if (isWorkspaceRoot(currentPath) || currentPath === rootPath) {
      return undefined;
    }

    currentPath = dirname(currentPath);
  }
}

function isWorkspaceRoot(path: string) {
  const packageJsonPath = join(path, "package.json");

  if (!existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      workspaces?: unknown;
    };
    return Array.isArray(packageJson.workspaces);
  } catch {
    return false;
  }
}

function showMissingEnvBanner() {
  console.warn(`
CODEXSUN environment file was not found.

Create the executable application's environment file before starting it:
  Copy-Item .env.example .env

Fill the values required by that application's environment schema.
Set CODEXSUN_ALLOW_MISSING_ENV=1 only when the environment is supplied externally.
`);
}

function showInvalidEnvBanner() {
  console.error(`
CODEXSUN environment is incomplete or invalid.

Check the executable application's .env file against its environment schema.
Framework validates the caller-provided schema and does not own product variables.
`);
}
