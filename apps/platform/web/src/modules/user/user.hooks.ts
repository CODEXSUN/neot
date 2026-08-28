import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateUser,
  createUser,
  deactivateUser,
  forceDeleteUser,
  listUsers,
  updateUser
} from "./user.services";
import { getUserProfile, updateUserProfile } from "./user.services";
import type { UserProfileSavePayload } from "./user.types";
import type { User, UserSavePayload } from "./user.types";
export const userQueryKey = ["identity", "users"] as const;
export const userProfileQueryKey = ["identity", "profile"] as const;
export function useUserProfileQuery() {
  return useQuery({ queryFn: getUserProfile, queryKey: userProfileQueryKey });
}
export function useUserProfileMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserProfileSavePayload) => updateUserProfile(payload),
    onSettled: () => client.invalidateQueries({ queryKey: userProfileQueryKey })
  });
}
export function useUsersQuery() {
  return useQuery({ queryFn: () => listUsers(), queryKey: userQueryKey });
}

export function useUserMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: userQueryKey });
  return {
    activate: useMutation({
      mutationFn: (record: User) => activateUser(record.id),
      onSuccess: done
    }),
    create: useMutation({ mutationFn: createUser, onSuccess: done }),
    deactivate: useMutation({
      mutationFn: (record: User) => deactivateUser(record.id),
      onSuccess: done
    }),
    forceDelete: useMutation({
      mutationFn: (record: User) => forceDeleteUser(record.id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: UserSavePayload }) =>
        updateUser(id, payload),
      onSuccess: done
    })
  };
}
