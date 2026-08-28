import { useMemo, useState } from "react";
import { BugIcon, ClipboardCheckIcon, ListTodoIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@neot/ui";
import { Input } from "@neot/ui/components/input";
import { WorkspaceFormField, WorkspaceFormGrid } from "@neot/ui/workspace/upsert";
import { WorkspaceSelect } from "@neot/ui/workspace/select";
import { createProjectManagerRecord } from "../project-manager/project-manager.services";
import type { ProjectManagerRegistryModuleNode } from "../project-manager/project-manager.types";

type RaiseMode = "issue" | "issue-review" | "issue-task" | "issue-task-review";

export function ModuleIssueDialog({
  activeTab,
  module
}: {
  activeTab: string;
  module: ProjectManagerRegistryModuleNode;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyForm(module, activeTab));
  const generatedTitle = useMemo(
    () => `[${module.name}] ${form.subject.trim() || "Module issue"}`,
    [form.subject, module.name]
  );

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) setForm(emptyForm(module, activeTab));
  }

  async function submit() {
    if (!form.subject.trim() || !form.details.trim()) {
      toast.error("Subject and details are required.");
      return;
    }
    setSaving(true);
    try {
      const stamp = Date.now();
      const issueKey = `issue.${safe(module.key)}.${stamp}`;
      const title = form.title.trim() || generatedTitle;
      const description = issueDescription(module, activeTab, form);
      const issue = await createProjectManagerRecord("issue", {
        description,
        key: issueKey,
        moduleKey: module.key,
        priority: form.priority,
        referenceId: module.id,
        referenceType: "module",
        status: "open",
        title,
        type: "module-issue"
      });
      const work: Array<Promise<unknown>> = [];
      if (form.mode === "issue-task" || form.mode === "issue-task-review")
        work.push(
          createProjectManagerRecord("task", {
            description: `Resolve ${issue.key}.\n\n${description}`,
            key: `task.${safe(module.key)}.${stamp}`,
            moduleKey: module.key,
            priority: form.priority,
            referenceId: issue.key,
            referenceType: "issue",
            status: "assigned",
            title: `Action: ${title}`,
            type: "issue-action"
          })
        );
      if (form.mode === "issue-review" || form.mode === "issue-task-review")
        work.push(
          createProjectManagerRecord("review", {
            description: `Review ${issue.key}.\n\n${description}`,
            key: `review.${safe(module.key)}.${stamp}`,
            moduleKey: module.key,
            priority: form.priority,
            referenceId: issue.key,
            referenceType: "issue",
            status: "requested",
            title: `Review: ${title}`,
            type: "issue-review"
          })
        );
      await Promise.all(work);
      toast.success("Module issue raised", {
        description: `${issue.key}${work.length ? ` with ${work.length} linked work item(s)` : ""}.`
      });
      setOpen(false);
    } catch (error) {
      toast.error("Could not raise issue", {
        description: error instanceof Error ? error.message : "Please try again."
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <Button
        size="icon"
        variant="outline"
        title={`Raise issue for ${module.name}`}
        onClick={() => changeOpen(true)}
      >
        <BugIcon className="size-4" />
        <span className="sr-only">Raise issue</span>
      </Button>
      <DialogContent className="max-w-2xl rounded-md">
        <DialogHeader>
          <DialogTitle>Raise module issue</DialogTitle>
          <DialogDescription>
            Create AI-readable issue context for {module.name}, with optional linked action task and
            review.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md border bg-muted/25 px-4 py-3 text-xs">
          <div>
            <strong>Module:</strong> {module.name}
          </div>
          <div className="mt-1 font-mono">
            {module.id} · {module.key}
          </div>
        </div>
        <WorkspaceFormGrid columns={2}>
          <WorkspaceFormField label="Subject" required>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="What is affected?"
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Manual title">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={generatedTitle}
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Event">
            <Input
              value={form.event}
              onChange={(e) => setForm({ ...form, event: e.target.value })}
              placeholder="save, confirm, load..."
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Place">
            <Input
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value })}
              placeholder="form, table, field, worker..."
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Path">
            <Input
              className="font-mono"
              value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
            />
          </WorkspaceFormField>
          <WorkspaceFormField label="Priority">
            <WorkspaceSelect
              value={form.priority}
              options={[
                { label: "Medium", value: "medium" },
                { label: "High", value: "high" },
                { label: "Critical", value: "critical" },
                { label: "Low", value: "low" }
              ]}
              onValueChange={(priority) => setForm({ ...form, priority })}
            />
          </WorkspaceFormField>
          <WorkspaceFormField className="md:col-span-2" label="Details" required>
            <textarea
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              placeholder="What happened, expected behavior, reproduction, and useful evidence for an AI agent."
            />
          </WorkspaceFormField>
          <WorkspaceFormField className="md:col-span-2" label="Create">
            <WorkspaceSelect
              value={form.mode}
              options={[
                { label: "Issue + task + review", value: "issue-task-review" },
                { label: "Issue + action task", value: "issue-task" },
                { label: "Issue + review", value: "issue-review" },
                { label: "Issue only", value: "issue" }
              ]}
              onValueChange={(mode) => setForm({ ...form, mode: mode as RaiseMode })}
            />
          </WorkspaceFormField>
        </WorkspaceFormGrid>
        <div className="rounded-md border px-4 py-3 text-sm">
          <div className="font-medium">Title preview</div>
          <div className="mt-1 text-muted-foreground">{form.title.trim() || generatedTitle}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => void submit()}>
            {form.mode.includes("task") ? (
              <ListTodoIcon className="size-4" />
            ) : (
              <ClipboardCheckIcon className="size-4" />
            )}
            {saving ? "Raising..." : "Raise issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(module: ProjectManagerRegistryModuleNode, activeTab: string) {
  return {
    details: "",
    event: "",
    mode: "issue-task-review" as RaiseMode,
    path: module.routePath || window.location.pathname,
    place: `${activeTab} tab`,
    priority: "medium",
    subject: "",
    title: ""
  };
}
function safe(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function issueDescription(
  module: ProjectManagerRegistryModuleNode,
  activeTab: string,
  form: ReturnType<typeof emptyForm>
) {
  return [
    `## Module context`,
    `- Name: ${module.name}`,
    `- Module ID: ${module.id}`,
    `- Module key: ${module.key}`,
    `- Module type: ${module.moduleType}`,
    `- Registry status: ${module.status}`,
    ``,
    `## Location`,
    `- Tab: ${activeTab}`,
    `- Event: ${form.event.trim() || "Not specified"}`,
    `- Path: ${form.path.trim() || "Not specified"}`,
    `- Place: ${form.place.trim() || "Not specified"}`,
    ``,
    `## Subject`,
    form.subject.trim(),
    ``,
    `## Details`,
    form.details.trim(),
    ``,
    `## Expected agent action`,
    `Inspect the identified module, reproduce or verify the issue, assess database/routes/files/actions/events impact, implement or recommend a fix, add tests, and update this issue with evidence.`
  ].join("\n");
}
