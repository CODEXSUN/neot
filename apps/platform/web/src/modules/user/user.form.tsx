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
import { userSchema } from "./user.schema";
import type { User, UserAccessOption, UserAccessSelection, UserSavePayload } from "./user.types";

type FormValue = UserSavePayload & { confirmPassword: string };

export function UserForm(props: {
  error?: string;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: UserSavePayload) => void;
  open: boolean;
  record: User | null;
  roleOptions: UserAccessOption[];
  selectedAccess: UserAccessSelection;
}) {
  const { error, loading, onCancel, onSubmit, open, record, roleOptions, selectedAccess } = props;
  const initialValue: FormValue = {
    confirmPassword: "",
    email: record?.email ?? "",
    name: record?.name ?? "",
    password: "",
    ...(selectedAccess.roleId ? { roleId: selectedAccess.roleId } : {}),
    status: record?.status ?? "active"
  };
  return (
    <WorkspaceUpsertDialog description="Manage the local account and platform role." onClose={onCancel} open={open} title={`${record ? "Edit" : "New"} user`}>
      <UserFormBody key={`${record?.id ?? "new"}:${open}`} {...(error ? { error } : {})} initialValue={initialValue} loading={loading} onCancel={onCancel} onSubmit={onSubmit} record={record} roleOptions={roleOptions} />
    </WorkspaceUpsertDialog>
  );
}

function UserFormBody(props: {
  error?: string;
  initialValue: FormValue;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (value: UserSavePayload) => void;
  record: User | null;
  roleOptions: UserAccessOption[];
}) {
  const { error, initialValue, loading, onCancel, onSubmit, record, roleOptions } = props;
  const [value, setValue] = useState(initialValue);
  const [validationError, setValidationError] = useState("");
  return (
    <form noValidate onSubmit={(event) => {
      event.preventDefault();
      const parsed = userSchema.safeParse(value);
      if (!parsed.success) {
        setValidationError(parsed.error.issues[0]?.message ?? "Check the user details.");
        return;
      }
      if (!record && !parsed.data.password) {
        setValidationError("Password is required for a new user.");
        return;
      }
      const { confirmPassword: _confirmation, ...payload } = parsed.data;
      setValidationError("");
      onSubmit({
        email: payload.email,
        name: payload.name,
        ...(payload.password ? { password: payload.password } : {}),
        ...(value.roleId ? { roleId: value.roleId } : {}),
        status: payload.status
      });
    }}>
      {validationError || error ? <WorkspaceFormBanner title="Unable to save">{validationError || error}</WorkspaceFormBanner> : null}
      <WorkspaceFormGrid columns={2}>
        <WorkspaceFormField label="Name" required><Input autoFocus value={value.name} onChange={(event) => setValue((current) => ({ ...current, name: event.target.value }))} /></WorkspaceFormField>
        <WorkspaceFormField label="Email" required><Input type="email" value={value.email} onChange={(event) => setValue((current) => ({ ...current, email: event.target.value }))} /></WorkspaceFormField>
        <WorkspaceFormField label="Password" required={!record}><Input autoComplete="new-password" type="password" value={value.password ?? ""} onChange={(event) => setValue((current) => ({ ...current, password: event.target.value }))} /></WorkspaceFormField>
        <WorkspaceFormField label="Confirm password" required={!record}><Input autoComplete="new-password" type="password" value={value.confirmPassword} onChange={(event) => setValue((current) => ({ ...current, confirmPassword: event.target.value }))} /></WorkspaceFormField>
        <WorkspaceFormField label="Role" required>
          <select className="h-10 w-full rounded-md border bg-background px-3" value={value.roleId ?? ""} onChange={(event) => setValue((current) => ({ ...current, roleId: Number(event.target.value) }))}>
            {roleOptions.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
          </select>
        </WorkspaceFormField>
        <WorkspaceSwitchCard ariaLabel="User active status" checked={value.status === "active"} fieldLabel="Status" onCheckedChange={(checked) => setValue((current) => ({ ...current, status: checked ? "active" : "inactive" }))} />
      </WorkspaceFormGrid>
      <WorkspaceFormFooter className="mt-6 border-t pt-4" onCancel={onCancel} primaryLabel="Save user" primaryLoading={loading} primaryProps={{ children: <><Save className="size-4" />Save user</> }} />
    </form>
  );
}
