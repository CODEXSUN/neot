import type {
  ProjectManagerForm,
  ProjectManagerKind,
  ProjectManagerRecord
} from "./project-manager.types";

export const projectManagerKinds: Array<{
  kind: ProjectManagerKind;
  label: string;
}> = [
  { kind: "project", label: "Projects" },
  { kind: "issue", label: "Issues" },
  { kind: "task", label: "Tasks" },
  { kind: "review", label: "Reviews" },
  { kind: "kanban", label: "Kanban" },
  { kind: "todo", label: "Todos" },
  { kind: "timeline", label: "Timeline" },
  { kind: "activity", label: "Action" },
  { kind: "discussion", label: "Discussions" },
  { kind: "release", label: "Releases" }
];

export function formFromRecord(record?: ProjectManagerRecord | null): ProjectManagerForm {
  return {
    assignee: record?.assignee ?? "",
    description: record?.description ?? "",
    dueDate: record?.dueDate ?? "",
    key: record?.key ?? "",
    lane: record?.lane ?? "",
    logoText: record?.logoText ?? "",
    colorKey: record?.colorKey ?? "slate",
    repositoryName: record?.repositoryName ?? "",
    repositoryUrl: record?.repositoryUrl ?? "",
    moduleKey: record?.moduleKey ?? "project-manager",
    priority: record?.priority ?? "medium",
    referenceId: record?.referenceId ?? "",
    referenceType: record?.referenceType ?? "",
    sortOrder: String(record?.sortOrder ?? 0),
    startDate: record?.startDate ?? "",
    status: record?.status ?? "open",
    title: record?.title ?? "",
    type: record?.type ?? "",
    ...(record?.id ? { id: record.id } : {})
  };
}

export function payloadFromForm(form: ProjectManagerForm) {
  return {
    assignee: form.assignee.trim(),
    description: form.description.trim(),
    dueDate: form.dueDate.trim(),
    key: form.key.trim(),
    lane: form.lane.trim(),
    logoText: form.logoText.trim().toUpperCase(),
    colorKey: form.colorKey,
    repositoryName: form.repositoryName.trim(),
    repositoryUrl: form.repositoryUrl.trim(),
    moduleKey: form.moduleKey.trim() || "project-manager",
    priority: form.priority,
    referenceId: form.referenceId.trim(),
    referenceType: form.referenceType.trim(),
    sortOrder: Number(form.sortOrder) || 0,
    startDate: form.startDate.trim(),
    status: form.status.trim() || "open",
    title: form.title.trim(),
    type: form.type.trim()
  };
}

export function validateProjectManagerForm(form: ProjectManagerForm) {
  if (!form.key.trim()) return "Key is required.";
  if (!form.title.trim()) return "Title is required.";
  return "";
}
