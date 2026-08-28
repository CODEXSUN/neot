import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { AppError } from "@neot/framework/errors";

export type SkillSummary = {
  description: string;
  files: string[];
  name: string;
  prompting: boolean;
  review: boolean;
};

type SkillMetadata = { prompting: boolean; review: boolean };

export class SkillsRepository {
  private readonly root = resolveSkillsRoot();

  async list(): Promise<SkillSummary[]> {
    await mkdir(this.root, { recursive: true });
    const entries = await readdir(this.root, { withFileTypes: true });
    return Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && validName(entry.name))
        .map((entry) => this.summary(entry.name))
    );
  }

  async create(input: { description: string; name: string }) {
    requireName(input.name);
    await mkdir(this.root, { recursive: true });
    const directory = this.skillDirectory(input.name);
    await mkdir(directory, { recursive: false }).catch(() => {
      throw new AppError({ code: "SKILL_EXISTS", message: "A skill with this name already exists.", statusCode: 409 });
    });
    await this.writeManifest(input.name, input.description, []);
    await this.writeMetadata(input.name, { prompting: false, review: false });
    return this.summary(input.name);
  }

  async read(name: string, file: string) {
    return readFile(this.safeFile(name, file), "utf8").catch(() => {
      throw AppError.notFound("Skill file was not found.");
    });
  }

  async createReference(name: string, file: string, content: string) {
    const reference = normalizeReferencePath(file);
    const target = this.safeFile(name, reference);
    await mkdir(resolve(target, ".."), { recursive: true });
    try {
      await writeFile(target, content, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if (isAlreadyExists(error)) {
        throw new AppError({
          code: "SKILL_FILE_EXISTS",
          message: `The reference file "${reference}" already exists.`,
          statusCode: 409
        });
      }
      throw error;
    }
    await this.refreshManifest(name);
    return { file: reference, skill: await this.summary(name) };
  }

  async save(name: string, file: string, content: string) {
    const target = this.safeFile(name, file);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, content, "utf8");
    return this.summary(name);
  }

  async setUsage(name: string, metadata: SkillMetadata) {
    await this.writeMetadata(name, metadata);
    return this.summary(name);
  }

  async export(name: string) {
    const summary = await this.summary(name);
    const paths = ["SKILL.md", ...summary.files];
    const files = await Promise.all(
      paths.map(async (path) => ({ content: await this.readInternal(name, path), path }))
    );
    return { exportedAt: new Date().toISOString(), files, skill: summary };
  }

  async promptingContext() {
    const skills = (await this.list()).filter((skill) => skill.prompting || skill.review);
    return Promise.all(
      skills.map(async (skill) => ({
        content: await this.readInternal(skill.name, "SKILL.md"),
        root: relative(process.cwd(), this.skillDirectory(skill.name)).replaceAll("\\", "/"),
        name: skill.name,
        prompting: skill.prompting,
        review: skill.review
      }))
    );
  }

  private async summary(name: string): Promise<SkillSummary> {
    requireName(name);
    const content = await this.readInternal(name, "SKILL.md");
    const metadata = await this.readMetadata(name);
    return {
      description: frontmatterValue(content, "description"),
      files: await listFiles(this.skillDirectory(name)),
      name,
      ...metadata
    };
  }

  private async readMetadata(name: string): Promise<SkillMetadata> {
    try {
      return JSON.parse(await readFile(join(this.skillDirectory(name), ".neot.json"), "utf8")) as SkillMetadata;
    } catch {
      return { prompting: false, review: false };
    }
  }

  private async writeMetadata(name: string, metadata: SkillMetadata) {
    requireName(name);
    await writeFile(join(this.skillDirectory(name), ".neot.json"), JSON.stringify(metadata, null, 2), "utf8");
  }

  private skillDirectory(name: string) {
    requireName(name);
    return join(this.root, name);
  }

  private safeFile(name: string, file: string) {
    const directory = this.skillDirectory(name);
    const target = resolve(directory, file.replaceAll("\\", "/"));
    const internalName = file.replaceAll("\\", "/").toLowerCase();
    const baseName = internalName.split("/").at(-1);
    if (!target.startsWith(`${directory}${sep}`) || baseName === ".neot.json" || baseName === "skill.md") {
      throw new AppError({ code: "INVALID_SKILL_PATH", message: "Skill file path is invalid.", statusCode: 400 });
    }
    return target;
  }

  private readInternal(name: string, file: string) {
    return readFile(join(this.skillDirectory(name), file), "utf8").catch(() => {
      throw AppError.notFound("Skill file was not found.");
    });
  }

  private async refreshManifest(name: string) {
    const current = await this.readInternal(name, "SKILL.md");
    await this.writeManifest(name, frontmatterValue(current, "description"), await listFiles(this.skillDirectory(name)));
  }

  private async writeManifest(name: string, description: string, references: string[]) {
    const links = references.length
      ? references.map((file) => `- Read [${file}](${file}) when its subject applies.`).join("\n")
      : "- No reference files have been added yet.";
    const content = `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n# ${titleCase(name)}\n\nUse the relevant reference files below when this skill is selected for prompting or review.\n\n## References\n\n${links}\n`;
    await writeFile(join(this.skillDirectory(name), "SKILL.md"), content, "utf8");
  }
}

export const skillsRepository = new SkillsRepository();

async function listFiles(directory: string, root = directory): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === ".neot.json" || entry.name.toLowerCase() === "skill.md") continue;
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(target, root)));
    else if ((await stat(target)).size <= 1_000_000) files.push(relative(root, target).replaceAll("\\", "/"));
  }
  return files.sort();
}

function resolveSkillsRoot() {
  return resolve(process.env.NEOT_SKILLS_ROOT?.trim() || join(process.cwd(), "assist", "skills", "library"));
}

function requireName(name: string) {
  if (!validName(name)) {
    throw new AppError({ code: "INVALID_SKILL_NAME", message: "Skill names use lowercase letters, numbers, and hyphens.", statusCode: 400 });
  }
}

function validName(name: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(name) && name.length <= 64;
}

function frontmatterValue(content: string, key: string) {
  const value = content.match(new RegExp(`^${key}:\\s*(.+)$`, "mu"))?.[1]?.trim();
  if (!value) return "No description provided.";
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
}

function titleCase(value: string) {
  return value.split("-").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}

function normalizeReferencePath(file: string) {
  const trimmed = file.trim().replaceAll("\\", "/");
  const path = trimmed.includes("/") ? trimmed : `references/${trimmed}`;
  const baseName = path.split("/").at(-1)?.toLowerCase();
  if (!baseName || baseName === ".md" || !baseName.endsWith(".md")) {
    throw new AppError({ code: "INVALID_SKILL_FILE", message: "Reference files must use the .md extension.", statusCode: 400 });
  }
  return path;
}

function isAlreadyExists(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}
