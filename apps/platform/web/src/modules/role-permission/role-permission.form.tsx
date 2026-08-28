import { useState } from "react";
import { Save } from "lucide-react";
import { WorkspaceLookup } from "@neot/ui/workspace/lookup";
import { WorkspaceSwitchCard } from "@neot/ui/workspace/status";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@neot/ui/workspace/upsert";
import { rolePermissionSchema } from "./role-permission.schema";
import type {
  RolePermission,
  RolePermissionPermissionLookup,
  RolePermissionRoleLookup,
  RolePermissionSavePayload
} from "./role-permission.types";

const emptyAssignment: RolePermissionSavePayload = {
  permissionId: 0,
  roleId: 0,
  status: "active"
};
export function RolePermissionForm({
  error,
  loading,
  lookupLoading,
  onCancel,
  onSubmit,
  open,
  permissions,
  record,
  roles
}: {
  error?: string;
  loading: boolean;
  lookupLoading: boolean;
  onCancel: () => void;
  onSubmit: (value: RolePermissionSavePayload) => void;
  open: boolean;
  permissions: RolePermissionPermissionLookup[];
  record: RolePermission | null;
  roles: RolePermissionRoleLookup[];
}) {
  return (
    <WorkspaceUpsertDialog
      description="Grant a permission to a role without leaving the list."
      onClose={onCancel}
      open={open}
      title={`${record ? "Edit" : "New"} role permission`}
    >
      <RolePermissionFormBody
        key={`${record?.id ?? "new"}:${open}`}
        {...(error ? { error } : {})}
        initialValue={
          record
            ? { permissionId: record.permissionId, roleId: record.roleId, status: record.status }
            : emptyAssignment
        }
        loading={loading}
        lookupLoading={lookupLoading}
        onCancel={onCancel}
        onSubmit={onSubmit}
        permissions={permissions}
        roles={roles}
      />
    </WorkspaceUpsertDialog>
  );
}
function RolePermissionFormBody({
  error,
  initialValue,
  loading,
  lookupLoading,
  onCancel,
  onSubmit,
  permissions,
  roles
}: {
  error?: string;
  initialValue: RolePermissionSavePayload;
  loading: boolean;
  lookupLoading: boolean;
  onCancel: () => void;
  onSubmit: (value: RolePermissionSavePayload) => void;
  permissions: RolePermissionPermissionLookup[];
  roles: RolePermissionRoleLookup[];
}) {
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  const shownError = validationError || error;
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = rolePermissionSchema.safeParse(value);
        if (!parsed.success) {
          setValidationError(parsed.error.issues[0]?.message ?? "Check the assignment.");
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
        <WorkspaceFormField label="Role" required>
          <WorkspaceLookup
            allowTextValue={false}
            loading={lookupLoading}
            options={roles
              .filter((item) => item.status === "active" || item.id === value.roleId)
              .map((item) => ({
                description: item.key,
                label: item.label,
                value: String(item.id)
              }))}
            required
            value={value.roleId ? String(value.roleId) : ""}
            onValueChange={(id) => setValue((current) => ({ ...current, roleId: Number(id) || 0 }))}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Permission" required>
          <WorkspaceLookup
            allowTextValue={false}
            loading={lookupLoading}
            options={permissions
              .filter((item) => item.status === "active" || item.id === value.permissionId)
              .map((item) => ({
                description: item.key,
                label: item.label,
                value: String(item.id)
              }))}
            required
            value={value.permissionId ? String(value.permissionId) : ""}
            onValueChange={(id) =>
              setValue((current) => ({ ...current, permissionId: Number(id) || 0 }))
            }
          />
        </WorkspaceFormField>
        <WorkspaceSwitchCard
          fieldLabel="Status"
          ariaLabel="Role permission active status"
          checked={value.status === "active"}
          onCheckedChange={(checked) =>
            setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))
          }
        />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel="Save role permission"
        primaryLoading={loading}
        primaryProps={{
          children: (
            <>
              <Save className="size-4" />
              Save role permission
            </>
          )
        }}
      />
    </form>
  );
}
