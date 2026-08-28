import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateRole,
  createRole,
  deactivateRole,
  forceDeleteRole,
  listRoles,
  updateRole
} from "./role.services";
import type { Role, RoleSavePayload } from "./role.types";
export const roleQueryKey = ["identity", "roles"] as const;
export function useRolesQuery() {
  return useQuery({ queryFn: () => listRoles(), queryKey: roleQueryKey });
}
export function useRoleMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: roleQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: Role) => activateRole(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createRole, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: Role) => deactivateRole(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: Role) => forceDeleteRole(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: RoleSavePayload }) =>
        updateRole(id, payload),
      onSuccess: done
    })
  };
}
