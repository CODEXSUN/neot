import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateRolePermission,
  createRolePermission,
  deactivateRolePermission,
  forceDeleteRolePermission,
  listRoleOptions,
  listPermissionOptions,
  listRolePermissions,
  updateRolePermission
} from "./role-permission.services";
import type { RolePermission, RolePermissionSavePayload } from "./role-permission.types";
export const rolePermissionQueryKey = ["identity", "role-permissions"] as const;
export function useRolePermissionsQuery() {
  return useQuery({
    queryFn: () => listRolePermissions(),
    queryKey: rolePermissionQueryKey
  });
}
export function useRolePermissionLookups() {
  return useQuery({
    queryFn: async () => {
      const [first, second] = await Promise.all([listRoleOptions(), listPermissionOptions()]);
      return { first, second };
    },
    queryKey: [...rolePermissionQueryKey, "lookups"]
  });
}
export function useRolePermissionMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: rolePermissionQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: RolePermission) => activateRolePermission(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createRolePermission, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: RolePermission) => deactivateRolePermission(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: RolePermission) => forceDeleteRolePermission(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: RolePermissionSavePayload }) =>
        updateRolePermission(id, payload),
      onSuccess: done
    })
  };
}
