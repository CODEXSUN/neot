import { Button } from "@neot/ui/components/button";
import { DownloadIcon, FileCode2Icon, FolderOpenIcon, FolderTreeIcon, PlusIcon, SaveIcon, SparklesIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SkillEditor } from "./skill-library.editor";
import { createSkill, createSkillReference, downloadSkill, listSkills, readSkillFile, saveSkillFile, setSkillUsage } from "./skill-library.services";
import type { SkillSummary } from "./skill-library.types";

export function SkillLibraryWorkspace() {
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [skillName, setSkillName] = useState("");
  const [file, setFile] = useState("");
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingReference, setAddingReference] = useState(false);
  const [selectedReference, setSelectedReference] = useState<File | null>(null);
  const skill = skills.find((entry) => entry.name === skillName);

  const refresh = async (preferred?: string) => {
    const next = await listSkills();
    setSkills(next);
    const selected = preferred || skillName || next[0]?.name || "";
    setSkillName(selected);
  };

  useEffect(() => { void refresh().catch((error: unknown) => toast.error(messageOf(error))); }, []);
  useEffect(() => {
    const first = skills.find((entry) => entry.name === skillName)?.files[0] ?? "";
    setFile(first);
  }, [skillName, skills]);
  useEffect(() => {
    if (!skillName || !file) { setContent(""); setSavedContent(""); return; }
    void readSkillFile(skillName, file)
      .then((result) => { setContent(result.content); setSavedContent(result.content); })
      .catch((error: unknown) => toast.error(messageOf(error)));
  }, [file, skillName]);

  const save = async () => {
    if (!skillName || !file) return;
    await saveSkillFile(skillName, file, content);
    setSavedContent(content);
    toast.success("Skill file saved");
    await refresh(skillName);
  };

  const create = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    try {
      await createSkill({ description, name });
      setCreating(false);
      await refresh(name);
    } catch (error) { toast.error(messageOf(error)); }
  };

  const updateUsage = async (key: "prompting" | "review", checked: boolean) => {
    if (!skill) return;
    const updated = await setSkillUsage(skill.name, { prompting: skill.prompting, review: skill.review, [key]: checked });
    setSkills((current) => current.map((entry) => entry.name === updated.name ? updated : entry));
  };

  const addReference = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!skill || !selectedReference) return;
    if (selectedReference.size > 1_000_000) {
      toast.error("Reference files must be 1 MB or smaller.");
      return;
    }
    try {
      const created = await createSkillReference(skill.name, selectedReference.name, await selectedReference.text());
      setAddingReference(false);
      setSelectedReference(null);
      await refresh(skill.name);
      setFile(created.file);
      toast.success("Reference file added");
    } catch (error) { toast.error(messageOf(error)); }
  };

  const download = async () => {
    if (!skill) return;
    const blob = await downloadSkill(skill.name);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${skill.name}.skill.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-[38rem] flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between gap-4 border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><SparklesIcon className="size-4" /></span>
          <div><h1 className="font-semibold">Skill Library</h1><p className="text-xs text-muted-foreground">Repository knowledge for prompting and reviews</p></div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreating((value) => !value)} size="sm" variant="outline"><PlusIcon /> New skill</Button>
          <Button disabled={!skill} onClick={() => setAddingReference((value) => !value)} size="sm" variant="outline"><FileCode2Icon /> Add reference</Button>
          <Button disabled={!skill || content === savedContent} onClick={() => void save()} size="sm"><SaveIcon /> Save</Button>
        </div>
      </header>
      {creating ? (
        <form className="flex flex-wrap items-end gap-3 border-b px-5 py-3" onSubmit={(event) => void create(event)}>
          <label className="grid gap-1 text-xs">Skill name<input className="h-9 rounded-md border px-3 text-sm" name="name" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="review-release-readiness" required /></label>
          <label className="grid min-w-72 flex-1 gap-1 text-xs">Trigger description<input className="h-9 rounded-md border px-3 text-sm" minLength={10} name="description" placeholder="Review release readiness, risks, evidence, and rollback plans." required /></label>
          <Button type="submit">Create skill</Button>
        </form>
      ) : null}
      {addingReference && skill ? (
        <form className="flex items-end gap-3 border-b px-5 py-3" onSubmit={(event) => void addReference(event)}>
          <div className="grid min-w-80 gap-1 text-xs">
            <span>Reference file</span>
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-muted">
              <FolderOpenIcon className="size-4 text-muted-foreground" />
              <span className="max-w-72 truncate">{selectedReference?.name ?? "Choose a Markdown file from your drive"}</span>
              <input accept=".md,text/markdown" className="sr-only" name="file" onChange={(event) => setSelectedReference(event.target.files?.[0] ?? null)} required type="file" />
            </label>
          </div>
          <p className="pb-2 text-xs text-muted-foreground">The file content is copied into references/ and linked from the hidden skill manifest.</p>
          <Button disabled={!selectedReference} type="submit">Add selected file</Button>
        </form>
      ) : null}
      <div className="flex min-h-0 flex-1">
        <aside className="w-64 shrink-0 overflow-y-auto border-r p-3">
          <p className="flex items-center gap-2 px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><FolderTreeIcon className="size-4" /> Skills</p>
          <div className="grid gap-1">
            {skills.map((entry) => (
              <button className={`rounded-lg px-3 py-2 text-left hover:bg-muted ${entry.name === skillName ? "bg-muted" : ""}`} key={entry.name} onClick={() => setSkillName(entry.name)} type="button">
                <span className="block text-sm font-medium">{entry.name}</span><span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{entry.description}</span>
              </button>
            ))}
            {!skills.length ? <p className="px-2 py-5 text-sm text-muted-foreground">Create the first repository skill.</p> : null}
          </div>
        </aside>
        <aside className="w-60 shrink-0 overflow-y-auto border-r p-3">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Files</p>
          {skill?.files.map((path) => (
            <button className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted ${path === file ? "bg-muted font-medium" : ""}`} key={path} onClick={() => setFile(path)} type="button"><FileCode2Icon className="size-4 shrink-0" /><span className="truncate">{path}</span></button>
          ))}
          {skill && !skill.files.length ? <p className="px-2 py-4 text-sm text-muted-foreground">No references yet. Add the first file to define this skill.</p> : null}
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          {skill ? (
            <>
              <div className="flex flex-wrap items-center gap-4 border-b px-4 py-2 text-sm">
                <span className="font-medium">{file}</span><span className="flex-1" />
                <label className="flex items-center gap-2"><input checked={skill.prompting} onChange={(event) => void updateUsage("prompting", event.target.checked)} type="checkbox" /> Use in prompts</label>
                <label className="flex items-center gap-2"><input checked={skill.review} onChange={(event) => void updateUsage("review", event.target.checked)} type="checkbox" /> Use in reviews</label>
                <Button onClick={() => void download()} size="sm" variant="ghost"><DownloadIcon /> Download</Button>
              </div>
              <div className="min-h-0 flex-1"><SkillEditor file={file} onChange={setContent} value={content} /></div>
            </>
          ) : <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Select or create a skill.</div>}
        </section>
      </div>
    </main>
  );
}

function messageOf(error: unknown) { return error instanceof Error ? error.message : "Skill operation failed."; }
