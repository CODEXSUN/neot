import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { Checkbox } from "@neot/ui/components/checkbox";
import { toast } from "@neot/ui/components/sonner";
import { cn } from "@neot/ui/lib/utils";
import { WorkspacePage } from "@neot/ui/workspace/page";
import {
  useRolePermissionLookups,
  useRolePermissionMutations,
  useRolePermissionsQuery
} from "./role-permission.hooks";
import type {
  RolePermissionPermissionLookup,
  RolePermissionRoleLookup
} from "./role-permission.types";

const protectedNamespaces = new Set(["identity", "settings"]);

export function RolePermissionWorkspace() {
  const assignments = useRolePermissionsQuery();
  const lookups = useRolePermissionLookups();
  const mutations = useRolePermissionMutations();
  const [roleId, setRoleId] = useState<number>();
  const roles = lookups.data?.first ?? [];
  const permissions = lookups.data?.second ?? [];
  const selectedRole = roles.find((role) => role.id === roleId) ?? roles[0];

  useEffect(() => {
    if (!roleId && selectedRole) setRoleId(selectedRole.id);
  }, [roleId, selectedRole]);

  const assignedByPermission = useMemo(
    () =>
      new Map(
        (assignments.data ?? [])
          .filter(
            (assignment) => assignment.roleId === selectedRole?.id && assignment.status === "active"
          )
          .map((assignment) => [assignment.permissionId, assignment])
      ),
    [assignments.data, selectedRole?.id]
  );
  const groups = useMemo(() => groupPermissions(permissions), [permissions]);
  const lockedRole = selectedRole?.key === "super-admin";
  const saving = mutations.create.isPending || mutations.forceDelete.isPending;

  async function toggle(permissionId: number, checked: boolean) {
    if (!selectedRole || lockedRole) return;
    const permission = permissions.find((item) => item.id === permissionId);
    if (!permission || isLockedPermission(selectedRole.key, permission.key)) return;
    try {
      const current = assignedByPermission.get(permissionId);
      if (checked && !current) {
        await mutations.create.mutateAsync({
          permissionId,
          roleId: selectedRole.id,
          status: "active"
        });
      }
      if (!checked && current) await mutations.forceDelete.mutateAsync(current);
      toast.success("Access controls saved", { description: permission.label });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The access control could not be saved."
      );
    }
  }

  async function setAll(checked: boolean) {
    if (!selectedRole || lockedRole) return;
    const eligible = permissions.filter(
      (permission) => !isLockedPermission(selectedRole.key, permission.key)
    );
    for (const permission of eligible) {
      if (checked !== assignedByPermission.has(permission.id)) {
        await toggle(permission.id, checked);
      }
    }
  }

  return (
    <WorkspacePage
      actions={
        <Button
          disabled={assignments.isFetching || lookups.isFetching}
          onClick={() => {
            void assignments.refetch();
            void lookups.refetch();
          }}
          type="button"
          variant="outline"
        >
          <RefreshCw
            className={cn(
              "size-4",
              (assignments.isFetching || lookups.isFetching) && "animate-spin"
            )}
          />
          Refresh
        </Button>
      }
      description="Select a role, then enable the features that it can use."
      technicalName="page.application.access.controls"
      title="Access controls"
    >
      <section className="grid gap-5 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <RoleSelector roles={roles} selectedRoleId={selectedRole?.id} onSelect={setRoleId} />
        <section className="min-w-0 rounded-md border bg-card">
          <header className="flex min-w-[44rem] flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">
                {selectedRole?.label ?? "Role"} permissions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {lockedRole
                  ? "Super Admin has every feature and its access cannot be reduced."
                  : "Turn on only the features this role needs."}
              </p>
            </div>
            {lockedRole ? (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                <ShieldCheck className="size-4" />
                Full access
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  disabled={saving}
                  onClick={() => void setAll(true)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Select all
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => void setAll(false)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Clear all
                </Button>
              </div>
            )}
          </header>
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-5 p-5">
              {groups.map(([namespace, entries]) => (
                <PermissionGroup
                  entries={entries}
                  isChecked={(permissionId) =>
                    Boolean(lockedRole || assignedByPermission.has(permissionId))
                  }
                  isDisabled={(permissionKey) =>
                    Boolean(
                      lockedRole ||
                      isLockedPermission(selectedRole?.key ?? "", permissionKey) ||
                      saving
                    )
                  }
                  key={namespace}
                  namespace={namespace}
                  onToggle={toggle}
                />
              ))}
            </div>
          </div>
        </section>
      </section>
    </WorkspacePage>
  );
}

function RoleSelector({
  roles,
  selectedRoleId,
  onSelect
}: {
  roles: RolePermissionRoleLookup[];
  selectedRoleId: number | undefined;
  onSelect: (roleId: number) => void;
}) {
  return (
    <aside aria-label="Roles" className="flex flex-col gap-2">
      {roles.map((role) => {
        const selected = role.id === selectedRoleId;
        return (
          <button
            className={cn(
              "rounded-md border px-4 py-3 text-left transition-colors",
              selected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted/60"
            )}
            key={role.id}
            onClick={() => onSelect(role.id)}
            type="button"
          >
            <span className="block text-sm font-semibold">{role.label}</span>
            <span
              className={cn(
                "mt-1 block text-xs",
                selected ? "text-primary-foreground/80" : "text-muted-foreground"
              )}
            >
              {roleDescription(role.key)}
            </span>
          </button>
        );
      })}
    </aside>
  );
}

function PermissionGroup({
  entries,
  isChecked,
  isDisabled,
  namespace,
  onToggle
}: {
  entries: RolePermissionPermissionLookup[];
  isChecked: (permissionId: number) => boolean;
  isDisabled: (permissionKey: string) => boolean;
  namespace: string;
  onToggle: (permissionId: number, checked: boolean) => Promise<void>;
}) {
  return (
    <fieldset className="w-80 shrink-0">
      <legend className="mb-2 text-sm font-semibold capitalize">{namespace}</legend>
      <div className="divide-y rounded-md border">
        {entries.map((permission) => {
          const checked = isChecked(permission.id);
          const disabled = isDisabled(permission.key);
          return (
            <label
              className={cn("flex items-center gap-3 px-3 py-2.5", disabled && "opacity-65")}
              key={permission.id}
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => void onToggle(permission.id, value === true)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{permission.label}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground">
                  {permission.key}
                </span>
              </span>
              {checked ? <Check className="ml-auto size-4 text-primary" /> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function groupPermissions(permissions: RolePermissionPermissionLookup[]) {
  return Object.entries(
    permissions.reduce<Record<string, RolePermissionPermissionLookup[]>>((groups, permission) => {
      const namespace = permission.key.split(".")[0] ?? "other";
      groups[namespace] ??= [];
      groups[namespace].push(permission);
      return groups;
    }, {})
  );
}

function isLockedPermission(roleKey: string, permissionKey: string) {
  return roleKey !== "super-admin" && protectedNamespaces.has(permissionKey.split(".")[0] ?? "");
}

function roleDescription(roleKey: string) {
  if (roleKey === "super-admin") return "All platform and NEOT controls.";
  if (roleKey === "admin") return "Administration and engineering access.";
  return "Choose the NEOT features this role can use.";
}
