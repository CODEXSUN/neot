import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Pencil, Plus, RefreshCw, Save } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@neot/ui/components/alert-dialog";
import { Input } from "@neot/ui/components/input";
import { WorkspaceFilters } from "@neot/ui/workspace/filters";
import { WorkspacePage } from "@neot/ui/workspace/page";
import { WorkspacePagination } from "@neot/ui/workspace/pagination";
import { WorkspaceRowActions } from "@neot/ui/workspace/row-actions";
import { WorkspaceSelect } from "@neot/ui/workspace/select";
import { WorkspaceDetailTable, WorkspaceShowCard } from "@neot/ui/workspace/show";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel,
  WorkspaceTableLoadingState
} from "@neot/ui/workspace/table";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceFormPanel,
  WorkspaceUpsertPage
} from "@neot/ui/workspace/upsert";
import { buildShowingLabel } from "@neot/ui/workspace/utils";

export type RegistryRecord = {
  id: number;
  isProtected?: boolean;
  status?: string;
  uuid: string;
};
export type RegistryField<T> = {
  createFromSearch?: (
    value: string
  ) => Promise<{ label: string; value: string }> | { label: string; value: string };
  format?: (value: unknown, record: T) => ReactNode;
  key: keyof T & string;
  label: string;
  list?: boolean;
  options?: Array<{ label: string; value: string }>;
  parse?: (value: string) => unknown;
  required?: boolean | undefined;
  type?: "number" | "password" | "reference" | "select" | "text";
};

export function RegistryWorkspace<T extends RegistryRecord>({
  createLabel,
  description,
  fields,
  initialValue,
  loading,
  records,
  saving,
  saveError,
  singular,
  technicalName,
  title,
  onCreate,
  onActivate,
  onDeactivate,
  onForceDelete,
  onRefresh,
  onUpdate
}: {
  createLabel: string;
  description: string;
  fields: RegistryField<T>[];
  initialValue: Omit<T, "id" | "uuid">;
  loading: boolean;
  records: T[];
  saving: boolean;
  saveError?: string | undefined;
  singular: string;
  technicalName: string;
  title: string;
  onCreate: (value: Omit<T, "id" | "uuid">) => boolean | void | Promise<boolean | void>;
  onActivate?: ((record: T) => boolean | void | Promise<boolean | void>) | undefined;
  onDeactivate?: ((record: T) => boolean | void | Promise<boolean | void>) | undefined;
  onForceDelete?: ((record: T) => boolean | void | Promise<boolean | void>) | undefined;
  onRefresh: () => void;
  onUpdate: (id: number, value: Omit<T, "id" | "uuid">) => boolean | void | Promise<boolean | void>;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [view, setView] = useState<
    { mode: "list" } | { mode: "show"; record: T } | { mode: "form"; record: T | null }
  >({ mode: "list" });
  const [destructiveAction, setDestructiveAction] = useState<{
    kind: "deactivate" | "force-delete";
    record: T;
  } | null>(null);
  const [destructivePending, setDestructivePending] = useState(false);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? records.filter((record) =>
          fields.some((field) =>
            String(record[field.key] ?? "")
              .toLowerCase()
              .includes(term)
          )
        )
      : records;
  }, [fields, records, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageRecords = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  if (view.mode === "show") {
    return (
      <WorkspacePage
        title={String(view.record[fields[0]?.key ?? "uuid"])}
        description={`Review ${singular} details and status.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView({ mode: "list" })}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {!view.record.isProtected ? (
              <Button onClick={() => setView({ mode: "form", record: view.record })}>
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : null}
          </div>
        }
      >
        <WorkspaceShowCard title={`${singular} details`}>
          <WorkspaceDetailTable
            rows={[
              ["UUID", view.record.uuid],
              ...fields.map((field): [string, ReactNode] => [
                field.label,
                field.format
                  ? field.format(view.record[field.key], view.record)
                  : String(view.record[field.key] ?? "-")
              ])
            ]}
          />
        </WorkspaceShowCard>
      </WorkspacePage>
    );
  }

  if (view.mode === "form") {
    return (
      <RegistryForm
        {...(saveError ? { error: saveError } : {})}
        fields={fields}
        initialValue={(view.record ?? initialValue) as Omit<T, "id" | "uuid">}
        loading={saving}
        title={view.record ? `Edit ${singular}` : createLabel}
        onBack={() =>
          setView(view.record ? { mode: "show", record: view.record } : { mode: "list" })
        }
        onSubmit={async (value) => {
          const saved = view.record ? await onUpdate(view.record.id, value) : await onCreate(value);
          if (saved === true) setView({ mode: "list" });
        }}
      />
    );
  }

  return (
    <>
      <WorkspacePage
        title={title}
        description={description}
        technicalName={technicalName}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
            <Button onClick={() => setView({ mode: "form", record: null })}>
              <Plus className="size-4" />
              {createLabel}
            </Button>
          </div>
        }
      >
        <WorkspaceFilters
          searchValue={search}
          searchPlaceholder={`Search ${title.toLowerCase()}`}
          onSearchValueChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <RegistryList
          fields={fields}
          loading={loading}
          records={pageRecords}
          onActivate={onActivate ? (record) => void onActivate(record) : undefined}
          onDeactivate={
            onDeactivate
              ? (record) => setDestructiveAction({ kind: "deactivate", record })
              : undefined
          }
          onEdit={(record) => setView({ mode: "form", record })}
          onForceDelete={
            onForceDelete
              ? (record) => setDestructiveAction({ kind: "force-delete", record })
              : undefined
          }
          onView={(record) => setView({ mode: "show", record })}
        />
        <WorkspacePagination
          page={page}
          rowsPerPage={rowsPerPage}
          showingLabel={buildShowingLabel(page, rowsPerPage, filtered.length)}
          singularLabel={title.toLowerCase()}
          totalCount={filtered.length}
          totalPages={totalPages}
          onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
          onPageChange={setPage}
          onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(1);
          }}
        />
      </WorkspacePage>
      <AlertDialog
        open={destructiveAction !== null}
        onOpenChange={(open) => {
          if (!open && !destructivePending) setDestructiveAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {destructiveAction?.kind === "force-delete"
                ? `Permanently delete ${singular.toLowerCase()}?`
                : `Deactivate ${singular.toLowerCase()}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {destructiveAction?.kind === "force-delete"
                ? "This action cannot be undone. Related assignments may block deletion."
                : "The record will become unavailable for new assignments until it is restored."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={destructivePending}>Cancel</AlertDialogCancel>
            <Button
              disabled={destructivePending}
              variant={destructiveAction?.kind === "force-delete" ? "destructive" : "default"}
              onClick={() => {
                if (!destructiveAction) return;
                const action = destructiveAction;
                setDestructivePending(true);
                void Promise.resolve(
                  action.kind === "force-delete"
                    ? onForceDelete?.(action.record)
                    : onDeactivate?.(action.record)
                )
                  .then((completed) => {
                    if (completed !== false) setDestructiveAction(null);
                  })
                  .finally(() => setDestructivePending(false));
              }}
            >
              {destructivePending
                ? "Working..."
                : destructiveAction?.kind === "force-delete"
                  ? "Force delete"
                  : "Deactivate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function RegistryList<T extends RegistryRecord>({
  fields,
  loading,
  onActivate,
  onDeactivate,
  onEdit,
  onForceDelete,
  onView,
  records
}: {
  fields: RegistryField<T>[];
  loading: boolean;
  onActivate?: ((record: T) => void) | undefined;
  onDeactivate?: ((record: T) => void) | undefined;
  onEdit: (record: T) => void;
  onForceDelete?: ((record: T) => void) | undefined;
  onView: (record: T) => void;
  records: T[];
}) {
  const columns = fields.filter((field) => field.list !== false);
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <WorkspaceTableHeaderCell>#</WorkspaceTableHeaderCell>
              {columns.map((field) => (
                <WorkspaceTableHeaderCell key={field.key}>{field.label}</WorkspaceTableHeaderCell>
              ))}
              <WorkspaceTableHeaderCell className="text-right">Action</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr className="border-b border-border/70 last:border-0" key={record.id}>
                <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                {columns.map((field) => (
                  <td className="px-4 py-2.5" key={field.key}>
                    {field.key === "status" ? (
                      <WorkspaceStatusBadge
                        label={String(record[field.key])}
                        tone={record[field.key] === "active" ? "success" : "neutral"}
                      />
                    ) : field.format ? (
                      field.format(record[field.key], record)
                    ) : (
                      String(record[field.key] ?? "-")
                    )}
                  </td>
                ))}
                <td className="px-4 py-1.5 text-right">
                  <WorkspaceRowActions
                    title={String(record[fields[0]?.key ?? "uuid"])}
                    {...(!record.isProtected ? { onEdit: () => onEdit(record) } : {})}
                    onView={() => onView(record)}
                    {...(!record.isProtected && onDeactivate
                      ? { onDelete: () => onDeactivate(record) }
                      : {})}
                    {...(!record.isProtected && onActivate
                      ? { onRestore: () => onActivate(record) }
                      : {})}
                    {...(!record.isProtected && onForceDelete
                      ? {
                          actions: [
                            {
                              id: "force-delete",
                              label: "Force delete",
                              onSelect: () => onForceDelete(record),
                              tone: "destructive" as const
                            }
                          ]
                        }
                      : {})}
                    isSuspended={record.status !== "active"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length === 0 && loading ? <WorkspaceTableLoadingState /> : null}
      {records.length === 0 && !loading ? (
        <WorkspaceTableEmptyState>No records found.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

export function RegistryForm<T extends RegistryRecord>({
  error,
  fields,
  initialValue,
  loading,
  onBack,
  onSubmit,
  title
}: {
  error?: string | undefined;
  fields: RegistryField<T>[];
  initialValue: Omit<T, "id" | "uuid">;
  loading: boolean;
  onBack: () => void;
  onSubmit: (value: Omit<T, "id" | "uuid">) => void | Promise<void>;
  title: string;
}) {
  const [value, setValue] = useState(initialValue);
  const values = value as Record<string, unknown>;
  return (
    <WorkspaceUpsertPage
      title={title}
      description="Complete the required details and save."
      onBack={onBack}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(value);
        }}
      >
        <WorkspaceFormPanel
          title="Details"
          footer={
            <WorkspaceFormFooter
              onCancel={onBack}
              primaryLabel="Save"
              primaryLoading={loading}
              primaryProps={{
                children: (
                  <>
                    <Save className="size-4" />
                    Save
                  </>
                )
              }}
            />
          }
        >
          {error ? <WorkspaceFormBanner title="Unable to save">{error}</WorkspaceFormBanner> : null}
          <WorkspaceFormGrid>
            {fields.map((field) => (
              <WorkspaceFormField
                key={field.key}
                label={field.label}
                {...(field.required ? { required: true } : {})}
              >
                {field.type === "select" ? (
                  <WorkspaceSelect
                    value={String(values[field.key] ?? "")}
                    options={field.options ?? []}
                    onValueChange={(next) =>
                      setValue((current) => ({
                        ...current,
                        [field.key]: field.parse ? field.parse(next) : next
                      }))
                    }
                    placeholder={`Select ${field.label.toLowerCase()}`}
                  />
                ) : field.type === "reference" ? (
                  <RegistryReferenceField
                    field={field}
                    value={values[field.key]}
                    onChange={(next) =>
                      setValue((current) => ({
                        ...current,
                        [field.key]: field.parse ? field.parse(next) : next
                      }))
                    }
                  />
                ) : (
                  <Input
                    required={field.required}
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "password"
                          ? "password"
                          : "text"
                    }
                    value={String(values[field.key] ?? "")}
                    onChange={(event) =>
                      setValue((current) => ({
                        ...current,
                        [field.key]:
                          field.type === "number" ? Number(event.target.value) : event.target.value
                      }))
                    }
                  />
                )}
              </WorkspaceFormField>
            ))}
          </WorkspaceFormGrid>
        </WorkspaceFormPanel>
      </form>
    </WorkspaceUpsertPage>
  );
}

function RegistryReferenceField<T extends RegistryRecord>({
  field,
  onChange,
  value
}: {
  field: RegistryField<T>;
  onChange: (value: string) => void;
  value: unknown;
}) {
  const listId = useId();
  const options = field.options ?? [];
  const selected = options.find((option) => option.value === String(value ?? ""));
  const [search, setSearch] = useState(selected?.label ?? "");
  const [creating, setCreating] = useState(false);
  const exactMatch = options.some(
    (option) => option.label.toLowerCase() === search.trim().toLowerCase()
  );
  const canCreate = Boolean(field.createFromSearch && search.trim() && !exactMatch);

  useEffect(() => {
    setSearch(selected?.label ?? "");
  }, [selected?.label]);

  async function createReference() {
    if (!field.createFromSearch || !search.trim()) return;
    setCreating(true);
    try {
      const created = await field.createFromSearch(search.trim());
      setSearch(created.label);
      onChange(created.value);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex gap-2">
      <div className="min-w-0 flex-1">
        <Input
          list={listId}
          required={field.required}
          value={search}
          onChange={(event) => {
            const next = event.target.value;
            setSearch(next);
            const option = options.find(
              (item) => item.label.toLowerCase() === next.trim().toLowerCase()
            );
            if (option) onChange(option.value);
          }}
        />
        <datalist id={listId}>
          {options.map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>
      </div>
      {canCreate ? (
        <Button
          type="button"
          variant="outline"
          disabled={creating}
          onClick={() => void createReference()}
        >
          <Plus className="size-4" />
          Create
        </Button>
      ) : null}
    </div>
  );
}
