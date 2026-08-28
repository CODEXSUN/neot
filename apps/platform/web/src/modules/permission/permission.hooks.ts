import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activatePermission,
  createPermission,
  deactivatePermission,
  forceDeletePermission,
  listPermissions,
  updatePermission
} from "./permission.services";
import type { Permission, PermissionSavePayload } from "./permission.types";
export const permissionQueryKey = ["identity", "permissions"] as const;
export function usePermissionsQuery() {
  return useQuery({ queryFn: () => listPermissions(), queryKey: permissionQueryKey });
}
export function usePermissionMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: permissionQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: Permission) => activatePermission(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createPermission, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: Permission) => deactivatePermission(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: Permission) => forceDeletePermission(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: PermissionSavePayload }) =>
        updatePermission(id, payload),
      onSuccess: done
    })
  };
}
