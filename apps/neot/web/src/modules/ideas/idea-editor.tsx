import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import { Textarea } from "@neot/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@neot/ui/components/tooltip";
import {
  WorkspaceEditor,
  WorkspaceLookup,
  type WorkspaceMentionItem
} from "@neot/ui/workspace";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Code2Icon,
  EyeIcon,
  Globe2Icon,
  LockIcon,
  PenToolIcon,
  SaveIcon,
  XIcon
} from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { useIdea, useIdeaActions, useIdeaUsers, useIdeas } from "./ideas.hooks";
import type { Idea, IdeaInput, IdeaUser } from "./ideas.types";

const categories = ["General", "Product", "Engineering", "Design", "Research", "Operations"];
const statuses = ["open", "planned", "in-progress", "completed", "archived"];
const categoryColors: Record<string, string> = {
  Design: "#db2777",
  Engineering: "#7c3aed",
  General: "#2563eb",
  Operations: "#ea580c",
  Product: "#0891b2",
  Research: "#4f46e5"
};
const statusColors: Record<string, string> = {
  archived: "#64748b",
  completed: "#16a34a",
  "in-progress": "#ca8a04",
  open: "#0284c7",
  planned: "#7c3aed"
};

export function IdeaEditor({ uuid }: { uuid?: string }) {
  const query = useIdea(uuid ?? "");
  if (uuid && query.isLoading)
    return <main className="grid min-h-[70vh] place-items-center">Loading idea…</main>;
  return <IdeaEditorForm key={query.data?.updatedAt ?? "new"} idea={query.data} />;
}

function IdeaEditorForm({ idea }: { idea?: Idea | undefined }) {
  const actions = useIdeaActions();
  const ideas = useIdeas();
  const users = useIdeaUsers();
  const initialAutoTags = hashtagsFromContent(idea?.contentHtml ?? "");
  const autoTagsRef = useRef(initialAutoTags);
  const [ideaUuid, setIdeaUuid] = useState(idea?.uuid);
  const [referenceNumber, setReferenceNumber] = useState(idea?.referenceNumber);
  const [mode, setMode] = useState<"compose" | "html" | "preview">("compose");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [form, setForm] = useState<IdeaInput>({
    title: idea?.title ?? "",
    excerpt: idea?.excerpt ?? "",
    contentHtml: idea?.contentHtml ?? "",
    category: idea?.category ?? "General",
    categoryColor: idea?.categoryColor ?? categoryColors.General!,
    tags: uniqueTags([...(idea?.tags ?? []), ...initialAutoTags]),
    assigneeUuids: idea?.assigneeUuids ?? [],
    projectUuids: idea?.projectUuids ?? [],
    status: idea?.status ?? "open",
    statusColor: idea?.statusColor ?? statusColors.open!,
    visibility: idea?.visibility ?? "private"
  });
  const saving = actions.create.isPending || actions.update.isPending;
  const categoryOptions = lookupOptions(
    categories,
    ideas.data?.map((entry) => entry.category)
  );
  const statusOptions = lookupOptions(
    statuses,
    ideas.data?.map((entry) => entry.status)
  );
  const mentionOptions: WorkspaceMentionItem[] = (users.data ?? []).map((user) => ({
    description: user.email,
    id: user.uuid,
    label: user.name
  }));

  function assignUser(uuid: string) {
    setForm((current) =>
      current.assigneeUuids.includes(uuid)
        ? current
        : { ...current, assigneeUuids: [...current.assigneeUuids, uuid] }
    );
  }

  function updateContent(contentHtml: string) {
    const autoTags = hashtagsFromContent(contentHtml);
    setForm((current) => {
      const manualTags = current.tags.filter((tag) => !autoTagsRef.current.includes(tag));
      autoTagsRef.current = autoTags;
      return { ...current, contentHtml, tags: uniqueTags([...manualTags, ...autoTags]) };
    });
  }

  async function save() {
    if (!form.title.trim()) return toast.error("Add a title before saving.");
    const input = withGeneratedExcerpt(form);
    if (!input.excerpt) return toast.error("Add idea content before saving.");
    try {
      const saved = ideaUuid
        ? await actions.update.mutateAsync({ uuid: ideaUuid, input })
        : await actions.create.mutateAsync(input);
      toast.success(ideaUuid ? "Idea updated" : "Idea saved privately");
      window.location.assign(`/app/neot/ideas/${saved.uuid}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save idea.");
    }
  }

  async function uploadImage(file: File) {
    if (!form.title.trim()) throw new Error("Add a title before uploading an image.");
    try {
      let uuid = ideaUuid;
      if (!uuid) {
        const draft = await actions.create.mutateAsync(withGeneratedExcerpt(form, form.title));
        uuid = draft.uuid;
        setIdeaUuid(uuid);
        setReferenceNumber(draft.referenceNumber);
        toast.success("Draft created for the image upload.");
      }
      const attachment = await actions.attach.mutateAsync({ uuid, file });
      toast.success(`${attachment.name} added`);
      return { alt: attachment.name, src: attachment.url };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not upload the image.";
      toast.error(message);
      throw error;
    }
  }

  return (
    <main className="flex h-[calc(100svh-3.5rem)] min-h-0 w-full flex-col bg-background">
      <header className="flex min-h-16 items-center justify-between gap-3 border-b px-3 py-2 sm:gap-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => window.location.assign("/app/neot/ideas")}
          >
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <strong className="block truncate">
              {referenceNumber ? `#${referenceNumber} · ` : ""}
              {idea ? "Edit idea" : "Start a discussion"}
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <VisibilityButton
            canShare={Boolean(ideaUuid)}
            visibility={form.visibility}
            onChange={(visibility) => setForm({ ...form, visibility })}
          />
          <Button disabled={saving} onClick={() => void save()}>
            <SaveIcon />
            <span className="hidden sm:inline">
              {saving ? "Saving…" : idea ? "Save changes" : "Save private idea"}
            </span>
          </Button>
        </div>
      </header>
      <div
        className={`relative grid min-h-0 flex-1 overflow-y-auto transition-[grid-template-columns] duration-300 ease-out ${
          drawerOpen ? "xl:grid-cols-[minmax(0,1fr)_20rem]" : "xl:grid-cols-[minmax(0,1fr)_0rem]"
        }`}
      >
        {!drawerOpen ? (
          <Button
            aria-label="Expand idea details"
            className="absolute right-3 top-3 z-20 bg-background shadow-sm"
            size="icon"
            title="Expand idea details"
            type="button"
            variant="outline"
            onClick={() => setDrawerOpen(true)}
          >
            <ArrowLeftIcon />
          </Button>
        ) : null}
        <section className="min-h-0 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-none space-y-4 sm:space-y-5">
            <Input
              className="h-12 border border-input bg-white px-4 text-lg font-semibold shadow-sm"
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <div className="flex flex-wrap items-center justify-end gap-1 border-b pb-2">
              {(["compose", "html", "preview"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={mode === value ? "secondary" : "ghost"}
                  onClick={() => setMode(value)}
                >
                  {value === "compose" ? (
                    <PenToolIcon />
                  ) : value === "html" ? (
                    <Code2Icon />
                  ) : (
                    <EyeIcon />
                  )}
                  {value[0]!.toUpperCase() + value.slice(1)}
                </Button>
              ))}
            </div>
            {mode === "compose" ? (
              <WorkspaceEditor
                className="[&_.ProseMirror]:min-h-[55svh] [&_[data-slot=workspace-editor-markdown]]:min-h-[55svh] [&_[data-slot=workspace-editor-markdown]]:resize-none sm:[&_.ProseMirror]:min-h-[calc(100svh-18rem)] sm:[&_[data-slot=workspace-editor-markdown]]:min-h-[calc(100svh-18rem)]"
                content={form.contentHtml}
                mentions={mentionOptions}
                onChange={updateContent}
                onImageUpload={uploadImage}
                onMentionSelect={(mention) => assignUser(mention.id)}
                placeholder="Explain the problem, proposal, trade-offs, and what feedback you need…"
              />
            ) : null}
            {mode === "html" ? (
              <Textarea
                className="min-h-[55svh] font-mono text-sm sm:min-h-[calc(100svh-18rem)]"
                value={form.contentHtml}
                onChange={(event) => updateContent(event.target.value)}
                placeholder="Paste a complete HTML fragment or page body here…"
              />
            ) : null}
            {mode === "preview" ? (
              <div className="rounded-lg border bg-muted/20 p-2">
                <iframe
                  sandbox=""
                  title="Idea HTML preview"
                  className="min-h-[calc(55svh-1rem)] w-full rounded-md bg-white sm:min-h-[calc(100svh-19rem)]"
                  srcDoc={form.contentHtml}
                />
              </div>
            ) : null}
          </div>
        </section>
        <aside
          aria-hidden={!drawerOpen}
          className={`overflow-hidden bg-muted/20 transition-[transform,opacity] duration-300 ease-out ${
            drawerOpen
              ? "border-t px-4 py-5 opacity-100 sm:px-6 xl:border-l xl:border-t-0 xl:px-5 xl:py-6"
              : "translate-x-full opacity-0 max-xl:hidden"
          }`}
        >
          <div className="w-full xl:w-[18rem]">
            <div className="flex justify-start pb-4">
              <Button
                aria-label="Collapse idea details"
                size="icon"
                title="Collapse idea details"
                type="button"
                variant="ghost"
                onClick={() => setDrawerOpen(false)}
              >
                <ArrowRightIcon />
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-1 xl:gap-6">
              <Field
                label="Category"
                color={form.categoryColor}
                onColorChange={(categoryColor) => setForm({ ...form, categoryColor })}
              >
                <WorkspaceLookup
                  allowTextValue
                  clearable={false}
                  createLabel="Create category"
                  createMode="inline"
                  options={categoryOptions}
                  placeholder="Search or create category"
                  showAllOptionsOnFocus
                  value={form.category}
                  onValueChange={(category) =>
                    setForm({
                      ...form,
                      category,
                      categoryColor: categoryColors[category] ?? form.categoryColor
                    })
                  }
                />
              </Field>
              <Field
                label="Status"
                color={form.statusColor}
                onColorChange={(statusColor) => setForm({ ...form, statusColor })}
              >
                <WorkspaceLookup
                  allowTextValue
                  clearable={false}
                  createLabel="Create status"
                  createMode="inline"
                  options={statusOptions}
                  placeholder="Search or create status"
                  showAllOptionsOnFocus
                  value={form.status}
                  onValueChange={(status) =>
                    setForm({
                      ...form,
                      status,
                      statusColor: statusColors[status] ?? form.statusColor
                    })
                  }
                />
              </Field>
              <Field label="Tags" hint="Type a tag and press Enter">
                <TagInput
                  tags={form.tags}
                  onChange={(tags) => setForm((current) => ({ ...current, tags }))}
                />
              </Field>
              <Field label="Assigned to" hint="Select one or more active users">
                <AssigneeInput
                  assigneeUuids={form.assigneeUuids}
                  loading={users.isLoading}
                  users={users.data ?? []}
                  onChange={(assigneeUuids) =>
                    setForm((current) => ({ ...current, assigneeUuids }))
                  }
                />
              </Field>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function VisibilityButton({
  canShare,
  visibility,
  onChange
}: {
  canShare: boolean;
  visibility: "private" | "public";
  onChange: (visibility: "private" | "public") => void;
}) {
  const isPrivate = visibility === "private";
  const label = !canShare
    ? "Private: save this idea before sharing it publicly."
    : isPrivate
      ? "Private: only you can see this idea. Click to make public."
      : "Public: everyone can see this idea. Click to make private.";
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={label}
            className={
              isPrivate
                ? "border-amber-400/60 bg-amber-400/20 text-amber-600 hover:bg-amber-400/25 hover:text-amber-700"
                : undefined
            }
            size="icon"
            disabled={!canShare}
            type="button"
            variant="outline"
            onClick={() => onChange(isPrivate ? "public" : "private")}
          >
            {isPrivate ? <LockIcon className="stroke-[1.75]" /> : <Globe2Icon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Field({
  children,
  color,
  hint,
  label,
  onColorChange
}: {
  children: ReactNode;
  color?: string;
  hint?: string;
  label: string;
  onColorChange?: (color: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label className="text-sm font-medium">{label}</label>
          {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        </div>
        {color && onColorChange ? (
          <label
            className="relative block size-7 cursor-pointer overflow-hidden rounded-lg shadow-sm ring-1 ring-black/10 transition-transform hover:scale-105 focus-within:ring-2 focus-within:ring-ring"
            style={{ backgroundColor: color }}
            title={`Choose ${label.toLowerCase()} color`}
          >
            <input
              aria-label={`Choose ${label.toLowerCase()} color`}
              className="absolute inset-0 cursor-pointer opacity-0"
              type="color"
              value={color}
              onChange={(event) => onColorChange(event.target.value)}
            />
          </label>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function TagInput({ onChange, tags }: { onChange: (tags: string[]) => void; tags: string[] }) {
  const [value, setValue] = useState("");

  function commit() {
    const tag = normalizeTag(value);
    if (!tag || tags.some((entry) => entry.toLowerCase() === tag.toLowerCase()))
      return setValue("");
    onChange([...tags, tag]);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !value && tags.length) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
      {tags.map((tag) => (
        <span
          className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary"
          key={tag}
        >
          {tag}
          <button
            aria-label={`Remove ${tag}`}
            className="rounded-full hover:bg-primary/10"
            type="button"
            onClick={() => onChange(tags.filter((entry) => entry !== tag))}
          >
            <XIcon className="size-3.5" />
          </button>
        </span>
      ))}
      <input
        className="h-7 min-w-28 flex-1 bg-transparent px-1 text-sm outline-none"
        placeholder={tags.length ? "Add tag" : "Type and press Enter"}
        value={value}
        onBlur={commit}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

function AssigneeInput({
  assigneeUuids,
  loading,
  onChange,
  users
}: {
  assigneeUuids: string[];
  loading: boolean;
  onChange: (assigneeUuids: string[]) => void;
  users: IdeaUser[];
}) {
  const usersByUuid = new Map(users.map((user) => [user.uuid, user]));
  const options = users
    .filter((user) => !assigneeUuids.includes(user.uuid))
    .map((user) => ({ description: user.email, label: user.name, value: user.uuid }));

  return (
    <div className="space-y-2">
      {assigneeUuids.length ? (
        <div className="flex flex-wrap gap-1.5">
          {assigneeUuids.map((uuid) => {
            const user = usersByUuid.get(uuid);
            return (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/20 px-2.5 py-1 text-sm"
                key={uuid}
                title={user?.email ?? "Previously assigned user"}
              >
                {user?.name ?? "Unavailable user"}
                <button
                  aria-label={`Remove ${user?.name ?? "assigned user"}`}
                  className="rounded-full text-muted-foreground hover:text-destructive"
                  type="button"
                  onClick={() => onChange(assigneeUuids.filter((value) => value !== uuid))}
                >
                  <XIcon className="size-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}
      <WorkspaceLookup
        key={assigneeUuids.join(",")}
        allowTextValue={false}
        clearable={false}
        emptyLabel="No active users found."
        loading={loading}
        options={options}
        placeholder="Search active users"
        showAllOptionsOnFocus
        value=""
        onValueChange={(uuid) => {
          if (uuid) onChange([...assigneeUuids, uuid]);
        }}
      />
    </div>
  );
}

function lookupOptions(defaults: string[], stored: string[] = []) {
  return [...new Set([...defaults, ...stored].filter(Boolean))].map((value) => ({
    label: titleCase(value),
    value
  }));
}

function normalizeTag(value: string) {
  return value.trim().replace(/^#+/u, "").replace(/\s+/gu, "-").slice(0, 48);
}

function uniqueTags(tags: string[]) {
  return [...new Map(tags.map((tag) => [tag.toLowerCase(), tag])).values()].slice(0, 20);
}

function hashtagsFromContent(contentHtml: string) {
  const text = textFromHtml(contentHtml);
  return uniqueTags(
    Array.from(text.matchAll(/(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]{0,47})/gu), (match) =>
      normalizeTag(match[1] ?? "")
    ).filter(Boolean)
  );
}

function withGeneratedExcerpt(form: IdeaInput, fallback = ""): IdeaInput {
  return {
    ...form,
    excerpt: excerptFromContent(form.contentHtml) || fallback.trim().slice(0, 500)
  };
}

function excerptFromContent(contentHtml: string) {
  return textFromHtml(contentHtml)
    .slice(0, 500)
    .split("\n")
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}

function textFromHtml(contentHtml: string) {
  const textWithLines = contentHtml
    .replace(/<br\s*\/?\s*>/giu, "\n")
    .replace(/<\/(?:blockquote|div|h[1-6]|li|p|pre)>/giu, "\n")
    .replace(/<[^>]+>/gu, " ");
  const decoder = document.createElement("textarea");
  decoder.innerHTML = textWithLines;
  return decoder.value.replace(/\u00a0/gu, " ").replace(/\r\n?/gu, "\n");
}

function titleCase(value: string) {
  return value.replace(/[-_]+/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
