import { useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@neot/ui/components/input";
import { WorkspaceSwitchCard } from "@neot/ui/workspace/status";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@neot/ui/workspace/upsert";
import { roleSchema } from "./role.schema";
import type { Role, RoleSavePayload } from "./role.types";

const emptyRole: RoleSavePayload = { description: "", key: "", label: "", status: "active" };
export function RoleForm({
  error,
  loading,
  onCancel,
  onSubmit,
  open,
  record
}: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: RoleSavePayload) => void;
  open: boolean;
  record: Role | null;
}) {
  return (
    <WorkspaceUpsertDialog
      description="Enter the role details and save without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} role`}
    >
      <RoleFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={
          record
            ? {
                description: record.description,
                key: record.key,
                label: record.label,
                status: record.status
              }
            : emptyRole
        }
        loading={loading}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}
function RoleFormBody({
  error,
  initialValue,
  loading,
  onCancel,
  onSubmit
}: {
  error?: string;
  initialValue: RoleSavePayload;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: RoleSavePayload) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = roleSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the role details.");
          return;
        }
        setValidationError("");
        onSubmit(parsed.data);
      }}
    >
      {shownError ? (
        <WorkspaceFormBanner title="Unable to save">{shownError}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={1}>
        <WorkspaceFormField label="Role name" required>
          <Input
            autoFocus
            maxLength={160}
            required
            value={value.label}
            onChange={(event) => setValue((current) => ({ ...current, label: event.target.value }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Role key" required>
          <Input
            className="font-mono lowercase"
            maxLength={120}
            required
            value={value.key}
            onChange={(event) =>
              setValue((current) => ({ ...current, key: event.target.value.toLowerCase() }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Description">
          <Input
            maxLength={500}
            value={value.description}
            onChange={(event) =>
              setValue((current) => ({ ...current, description: event.target.value }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="Role active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save role"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save role
            </>
          )
        }}
      />
    </form>
  );
}
