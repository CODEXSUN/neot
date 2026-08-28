import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateUserRole,
  createUserRole,
  deactivateUserRole,
  forceDeleteUserRole,
  listUserOptions,
  listRoleOptions,
  listUserRoles,
  updateUserRole
} from "./user-role.services";
import type { UserRole, UserRoleSavePayload } from "./user-role.types";
export const userRoleQueryKey = ["identity", "user-roles"] as const;
export function useUserRolesQuery() {
  return useQuery({ queryFn: () => listUserRoles(), queryKey: userRoleQueryKey });
}
export function useUserRoleLookups() {
  return useQuery({
    queryFn: async () => {
      const [first, second] = await Promise.all([listUserOptions(), listRoleOptions()]);
      return { first, second };
    },
    queryKey: [...userRoleQueryKey, "lookups"]
  });
}
export function useUserRoleMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: userRoleQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: UserRole) => activateUserRole(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createUserRole, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: UserRole) => deactivateUserRole(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: UserRole) => forceDeleteUserRole(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: UserRoleSavePayload }) =>
        updateUserRole(id, payload),
      onSuccess: done
    })
  };
}
