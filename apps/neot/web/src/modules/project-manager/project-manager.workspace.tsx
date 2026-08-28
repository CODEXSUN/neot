import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ListChecksIcon,
  PlusIcon,
  RefreshCwIcon
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@neot/ui/components/button";
import { WorkspacePage } from "@neot/ui/workspace/page";
import { WorkspaceSelect } from "@neot/ui/workspace/select";
import { ProjectManagerFormPanel } from "./project-manager.form";
import {
  useProjectManagerMutations,
  useProjectManagerRecordsQuery,
  useProjectManagerResultQuery
} from "./project-manager.hooks";
import { ProjectManagerList } from "./project-manager.list";
import {
  formFromRecord,
  payloadFromForm,
  projectManagerKinds,
  validateProjectManagerForm
} from "./project-manager.schema";
import type {
  ProjectManagerForm,
  ProjectManagerKind,
  ProjectManagerRecord
} from "./project-manager.types";

export function ProjectManagerWorkspace() {
  const [kind, setKind] = useState<ProjectManagerKind>("issue");
  const [form, setForm] = useState<ProjectManagerForm | null>(null);
  const [saveError, setSaveError] = useState("");
  const resultQuery = useProjectManagerResultQuery();
  const recordsQuery = useProjectManagerRecordsQuery(kind);
  const mutations = useProjectManagerMutations(kind);
  const busy = recordsQuery.isFetching || mutations.create.isPending || mutations.update.isPending;
  const records = recordsQuery.data ?? [];
  const openRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.active && !["completed", "done", "released", "approved"].includes(record.status)
      ),
    [records]
  );

  function save() {
    if (!form) return;
    const error = validateProjectManagerForm(form);
    if (error) {
      setSaveError(error);
      return;
    }
    setSaveError("");
    const payload = payloadFromForm(form);
    const action = form.id
      ? mutations.update.mutateAsync({ id: form.id, payload })
      : mutations.create.mutateAsync(payload);
    action
      .then((record) => {
        toast.success("Project record saved", { description: record.title });
        setForm(null);
      })
      .catch((errorValue) =>
        setSaveError(errorValue instanceof Error ? errorValue.message : "Save failed.")
      );
  }

  return (
    <WorkspacePage
      title="Project Manager"
      description="JSON-backed project workbench for modules, tasks, reviews, kanban, releases, actions, and discussions."
      technicalName="page.project-manager"
      actions={
        <div className="flex flex-wrap justify-end gap-2">
          <div className="w-44">
            <WorkspaceSelect
              value={kind}
              options={projectManagerKinds.map((item) => ({ label: item.label, value: item.kind }))}
              onValueChange={(value) => {
                setKind(value as ProjectManagerKind);
                setForm(null);
              }}
            />
          </div>
          <Button
            disabled={busy}
            variant="outline"
            onClick={() => {
              void resultQuery.refetch();
              void recordsQuery.refetch();
            }}
          >
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
          <Button disabled={busy} onClick={() => setForm(formFromRecord())}>
            <PlusIcon className="size-4" />
            New
          </Button>
        </div>
      }
    >
      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Metric
          icon={ListChecksIcon}
          label="Total JSON records"
          value={String(resultQuery.data?.summary.total ?? 0)}
        />
        <Metric
          icon={CheckCircle2Icon}
          label="Active"
          value={String(resultQuery.data?.summary.active ?? 0)}
        />
        <Metric
          icon={AlertTriangleIcon}
          label="Risk"
          value={String(resultQuery.data?.summary.blocked ?? 0)}
        />
        <Metric
          icon={ListChecksIcon}
          label={`${labelForKind(kind)} open`}
          value={String(openRecords.length)}
        />
      </div>
      {form ? (
        <div className="mb-4">
          <ProjectManagerFormPanel
            error={saveError}
            form={form}
            loading={busy}
            onCancel={() => setForm(null)}
            onChange={setForm}
            onSubmit={save}
          />
        </div>
      ) : null}
      <ProjectManagerList
        records={records}
        onDeactivate={(record) => mutations.deactivate.mutate(record.id)}
        onDelete={(record) => {
          if (window.confirm(`Delete ${record.title}?`)) mutations.delete.mutate(record.id);
        }}
        onEdit={(record: ProjectManagerRecord) => setForm(formFromRecord(record))}
        onRestore={(record) => mutations.restore.mutate(record.id)}
      />
    </WorkspacePage>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: typeof ListChecksIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        {label}
        <Icon className="size-4" />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function labelForKind(kind: ProjectManagerKind) {
  return projectManagerKinds.find((item) => item.kind === kind)?.label ?? kind;
}
