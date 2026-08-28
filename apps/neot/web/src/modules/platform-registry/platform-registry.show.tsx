import { useState } from "react";
import {
  ArrowLeftIcon,
  ArchiveRestoreIcon,
  BanIcon,
  CheckIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  XIcon
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import {
  WorkspaceAnimatedTabs,
  type WorkspaceAnimatedTab
} from "@neot/ui/workspace/animated-tabs";
import { WorkspacePage } from "@neot/ui/workspace/page";
import {
  WorkspaceDetailTable,
  WorkspaceShowCard,
  WorkspaceShowLayout
} from "@neot/ui/workspace/show";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import type {
  ProjectManagerDocumentationRow,
  ProjectManagerPlanningNote,
  ProjectManagerRegistryModuleNode
} from "../project-manager/project-manager.types";
import { ModuleIssueDialog } from "./platform-registry.issue-dialog";

type Section = "actions" | "database" | "events" | "files" | "info" | "routes";

export function PlatformRegistryModuleShow({
  busy,
  embedded = false,
  module,
  parentName,
  onBack,
  onRefresh,
  onToggle,
  onUpdate
}: {
  busy: boolean;
  embedded?: boolean;
  module: ProjectManagerRegistryModuleNode;
  parentName: string;
  onBack: () => void;
  onRefresh: () => void;
  onToggle: () => void;
  onUpdate: (patch: Partial<ProjectManagerRegistryModuleNode>) => Promise<unknown>;
}) {
  const [activeTab, setActiveTab] = useState("info");
  const saveRows = async (section: Section, rows: ProjectManagerDocumentationRow[]) => {
    await onUpdate({ documentation: { ...module.documentation, [section]: rows } });
    toast.success("Module documentation saved");
  };
  const tabs: WorkspaceAnimatedTab[] = [
    {
      label: "Info",
      value: "info",
      content: (
        <InfoTab
          module={module}
          parentName={parentName}
          onUpdate={onUpdate}
          onSave={(rows) => saveRows("info", rows)}
        />
      )
    },
    ...(["database", "routes", "files", "actions", "events"] as Section[]).map((section) => ({
      label: title(section),
      value: section,
      content: (
        <EditableRows
          key={section}
          busy={busy}
          rows={module.documentation?.[section] ?? []}
          title={title(section)}
          onSave={(rows) => saveRows(section, rows)}
        />
      )
    })),
    {
      label: "Planning",
      value: "planning",
      content: (
        <PlanningNotes
          busy={busy}
          notes={module.planningNotes ?? []}
          onSave={async (planningNotes) => {
            await onUpdate({ planningNotes });
            toast.success("Planning notes saved");
          }}
        />
      )
    }
  ];
  return (
    <WorkspacePage
      {...(embedded ? { className: "!mx-0 !w-full !max-w-none !py-0" } : {})}
      title={module.name}
      description={module.description || `Module registry profile for ${module.name}.`}
      technicalName="page.platform-registry.module.show"
      actions={
        <div className="flex flex-wrap gap-2">
          <ModuleIssueDialog activeTab={activeTab} module={module} />
          <Button variant="outline" onClick={onBack}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <Button disabled={busy} variant="outline" onClick={onRefresh}>
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
          <Button disabled={busy} variant="outline" onClick={onToggle}>
            {module.active ? (
              <BanIcon className="size-4" />
            ) : (
              <ArchiveRestoreIcon className="size-4" />
            )}
            {module.active ? "Off" : "Restore"}
          </Button>
        </div>
      }
    >
      <WorkspaceAnimatedTabs tabs={tabs} value={activeTab} onValueChange={setActiveTab} />
    </WorkspacePage>
  );
}

function InfoTab({
  module,
  onSave,
  onUpdate,
  parentName
}: {
  module: ProjectManagerRegistryModuleNode;
  onSave: (rows: ProjectManagerDocumentationRow[]) => Promise<void>;
  onUpdate: (patch: Partial<ProjectManagerRegistryModuleNode>) => Promise<unknown>;
  parentName: string;
}) {
  return (
    <div className="space-y-4">
      <WorkspaceShowLayout>
        <InlineInfoCard module={module} parentName={parentName} onUpdate={onUpdate} />
        <WorkspaceShowCard title="Registry">
          <WorkspaceDetailTable
            rows={[
              ["ID", mono(module.id)],
              ["Group ID", mono(module.groupId)],
              ["Created", formatDate(module.createdAt)],
              ["Updated", formatDate(module.updatedAt)]
            ]}
          />
        </WorkspaceShowCard>
      </WorkspaceShowLayout>
      <EditableRows
        busy={false}
        rows={module.documentation?.info ?? []}
        title="Additional information"
        onSave={onSave}
      />
    </div>
  );
}

function InlineInfoCard({
  module,
  onUpdate,
  parentName
}: {
  module: ProjectManagerRegistryModuleNode;
  onUpdate: (patch: Partial<ProjectManagerRegistryModuleNode>) => Promise<unknown>;
  parentName: string;
}) {
  const [field, setField] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const rows: Array<{
    field?: keyof ProjectManagerRegistryModuleNode;
    label: string;
    value: string;
  }> = [
    { field: "name", label: "Name", value: module.name },
    { field: "key", label: "Key", value: module.key },
    { field: "moduleType", label: "Type", value: module.moduleType },
    { label: "Parent", value: parentName || "None" },
    { field: "status", label: "Status", value: module.active ? module.status : "off" },
    { field: "sortOrder", label: "Sort order", value: String(module.sortOrder) },
    { field: "description", label: "Description", value: module.description || "" }
  ];
  const save = async (row: (typeof rows)[number]) => {
    if (!row.field) return;
    const next = row.field === "sortOrder" ? Number(value || 0) : value;
    await onUpdate({ [row.field]: next });
    setField(null);
    toast.success(`${row.label} updated`);
  };
  return (
    <WorkspaceShowCard title="Module information">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row) => (
            <tr className="border-b last:border-b-0" key={row.label}>
              <th className="w-40 border-r bg-muted/35 px-3 py-2.5 text-left text-xs font-semibold uppercase text-muted-foreground">
                {row.label}
              </th>
              <td className="px-3 py-2.5">
                {field === row.field ? (
                  <Input value={value} onChange={(e) => setValue(e.target.value)} />
                ) : row.label === "Status" ? (
                  <WorkspaceStatusBadge
                    label={row.value}
                    tone={module.active ? "success" : "danger"}
                  />
                ) : (
                  <span className={row.label === "Key" ? "font-mono text-xs" : "font-medium"}>
                    {row.value || "Not set"}
                  </span>
                )}
              </td>
              <td className="w-24 px-3 py-2 text-right">
                {row.field ? (
                  field === row.field ? (
                    <RowButtons save onCancel={() => setField(null)} onSave={() => save(row)} />
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      title={`Edit ${row.label}`}
                      onClick={() => {
                        setField(String(row.field));
                        setValue(row.value);
                      }}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                  )
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </WorkspaceShowCard>
  );
}

function EditableRows({
  busy,
  onSave,
  rows,
  title: panelTitle
}: {
  busy: boolean;
  onSave: (rows: ProjectManagerDocumentationRow[]) => Promise<void>;
  rows: ProjectManagerDocumentationRow[];
  title: string;
}) {
  const [editing, setEditing] = useState<ProjectManagerDocumentationRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ key: "", value: "" });
  const saveDraft = async () => {
    if (!draft.key.trim() || !draft.value.trim()) return;
    const timestamp = new Date().toISOString();
    const next = editing
      ? rows.map((row) =>
          row.id === editing.id
            ? { ...row, key: draft.key.trim(), updatedAt: timestamp, value: draft.value.trim() }
            : row
        )
      : [
          ...rows,
          {
            createdAt: timestamp,
            id: `detail-${Date.now()}`,
            key: draft.key.trim(),
            updatedAt: timestamp,
            value: draft.value.trim()
          }
        ];
    await onSave(next);
    setEditing(null);
    setAdding(false);
    setDraft({ key: "", value: "" });
  };
  const startEdit = (row: ProjectManagerDocumentationRow) => {
    setEditing(row);
    setAdding(false);
    setDraft({ key: row.key, value: row.value });
  };
  return (
    <WorkspaceShowCard title={panelTitle}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                Value
              </th>
              <th className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t" key={row.id}>
                {editing?.id === row.id ? (
                  <>
                    <td className="px-3 py-2">
                      <Input
                        value={draft.key}
                        onChange={(event) => setDraft({ ...draft, key: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={draft.value}
                        onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <RowButtons
                        save
                        onCancel={() => {
                          setEditing(null);
                          setDraft({ key: "", value: "" });
                        }}
                        onSave={saveDraft}
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 font-medium">{row.key}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{row.value}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Edit row"
                        onClick={() => startEdit(row)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Delete row"
                        onClick={() => void onSave(rows.filter((item) => item.id !== row.id))}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {adding ? (
              <tr className="border-t">
                <td className="px-3 py-2">
                  <Input
                    placeholder="Key"
                    value={draft.key}
                    onChange={(event) => setDraft({ ...draft, key: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    placeholder="Value"
                    value={draft.value}
                    onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <RowButtons
                    save
                    onCancel={() => {
                      setAdding(false);
                      setDraft({ key: "", value: "" });
                    }}
                    onSave={saveDraft}
                  />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="border-t px-4 py-3">
        <Button
          disabled={busy || adding || Boolean(editing)}
          size="sm"
          variant="outline"
          onClick={() => setAdding(true)}
        >
          <PlusIcon className="size-4" />
          Add key and value
        </Button>
      </div>
    </WorkspaceShowCard>
  );
}

function PlanningNotes({
  busy,
  notes,
  onSave
}: {
  busy: boolean;
  notes: ProjectManagerPlanningNote[];
  onSave: (notes: ProjectManagerPlanningNote[]) => Promise<void>;
}) {
  const [editing, setEditing] = useState<ProjectManagerPlanningNote | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ body: "", title: "" });
  const submit = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    const now = new Date().toISOString();
    const next = editing
      ? notes.map((note) => (note.id === editing.id ? { ...note, ...draft, updatedAt: now } : note))
      : [{ ...draft, createdAt: now, id: `note-${Date.now()}`, updatedAt: now }, ...notes];
    await onSave(next);
    setEditing(null);
    setAdding(false);
    setDraft({ body: "", title: "" });
  };
  const editor =
    adding || editing ? (
      <WorkspaceShowCard title={editing ? "Edit note" : "New note"}>
        <div className="space-y-3 p-4">
          <Input
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
          <textarea
            className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Planning note"
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAdding(false);
                setEditing(null);
                setDraft({ body: "", title: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void submit()}>Save</Button>
          </div>
        </div>
      </WorkspaceShowCard>
    ) : null;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button disabled={busy || adding || Boolean(editing)} onClick={() => setAdding(true)}>
          <PlusIcon className="size-4" />
          New note
        </Button>
      </div>
      {editor}
      <div className="grid gap-4 md:grid-cols-2">
        {notes.map((note) => (
          <WorkspaceShowCard key={note.id}>
            <article className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{note.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {formatDate(note.createdAt)} · Updated {formatDate(note.updatedAt)}
                  </p>
                </div>
                <div>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Edit note"
                    onClick={() => {
                      setEditing(note);
                      setAdding(false);
                      setDraft({ body: note.body, title: note.title });
                    }}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Delete note"
                    onClick={() => void onSave(notes.filter((item) => item.id !== note.id))}
                  >
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm text-muted-foreground">{note.body}</p>
            </article>
          </WorkspaceShowCard>
        ))}
      </div>
    </div>
  );
}

function RowButtons({
  onCancel,
  onSave
}: {
  onCancel: () => void;
  onSave: () => Promise<void>;
  save: boolean;
}) {
  return (
    <div className="flex justify-end">
      <Button size="icon" variant="ghost" title="Save" onClick={() => void onSave()}>
        <CheckIcon className="size-4" />
      </Button>
      <Button size="icon" variant="ghost" title="Cancel" onClick={onCancel}>
        <XIcon className="size-4" />
      </Button>
    </div>
  );
}
function mono(value: string) {
  return <span className="font-mono text-xs">{value}</span>;
}
function formatDate(value: string) {
  return value ? new Date(value).toLocaleString() : "Not set";
}
function title(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
