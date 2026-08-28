import { SaveIcon, XIcon } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import { WorkspaceSelect } from "@neot/ui/workspace/select";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormGrid,
} from "@neot/ui/workspace/upsert";
import type { ProjectManagerForm } from "./project-manager.types";

export function ProjectManagerFormPanel({
  error,
  form,
  loading,
  onCancel,
  onChange,
  onSubmit,
}: {
  error: string;
  form: ProjectManagerForm;
  loading: boolean;
  onCancel: () => void;
  onChange: (form: ProjectManagerForm) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-md border bg-card p-4 shadow-sm">
      {error ? (
        <WorkspaceFormBanner title="Could not save">
          {error}
        </WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={3}>
        <WorkspaceFormField label="Key" required>
          <Input
            className="h-10 font-mono"
            value={form.key}
            onChange={(event) => onChange({ ...form, key: event.target.value })}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Title" required>
          <Input
            className="h-10"
            value={form.title}
            onChange={(event) =>
              onChange({ ...form, title: event.target.value })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Status">
          <Input
            className="h-10"
            value={form.status}
            onChange={(event) =>
              onChange({ ...form, status: event.target.value })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Priority">
          <WorkspaceSelect
            value={form.priority}
            options={[
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
              { label: "Critical", value: "critical" },
            ]}
            onValueChange={(priority) =>
              onChange({
                ...form,
                priority: priority as ProjectManagerForm["priority"],
              })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Assignee">
          <Input
            className="h-10"
            value={form.assignee}
            onChange={(event) =>
              onChange({ ...form, assignee: event.target.value })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Due date">
          <Input
            className="h-10"
            placeholder="YYYY-MM-DD"
            value={form.dueDate}
            onChange={(event) =>
              onChange({ ...form, dueDate: event.target.value })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Planned start">
          <Input
            className="h-10"
            placeholder="YYYY-MM-DD"
            value={form.startDate}
            onChange={(event) =>
              onChange({ ...form, startDate: event.target.value })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Reference">
          <Input
            className="h-10 font-mono"
            value={form.referenceId}
            onChange={(event) =>
              onChange({ ...form, referenceId: event.target.value })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Reference type">
          <Input
            className="h-10"
            value={form.referenceType}
            onChange={(event) =>
              onChange({ ...form, referenceType: event.target.value })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Lane">
          <Input
            className="h-10"
            value={form.lane}
            onChange={(event) =>
              onChange({ ...form, lane: event.target.value })
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Description">
          <textarea
            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm md:col-span-3"
            value={form.description}
            onChange={(event) =>
              onChange({ ...form, description: event.target.value })
            }
          />
        </WorkspaceFormField>
      </WorkspaceFormGrid>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          disabled={loading}
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          <XIcon className="size-4" />
          Cancel
        </Button>
        <Button disabled={loading} type="button" onClick={onSubmit}>
          <SaveIcon className="size-4" />
          Save
        </Button>
      </div>
    </div>
  );
}
