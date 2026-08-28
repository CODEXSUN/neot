import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bindSyncCloud,
  disconnectSyncCloud,
  generateSyncToken,
  getSyncStatus,
  getSyncTokens,
  publishSyncCloud,
  pullSyncCloud,
  revokeSyncToken,
  verifySyncCloud
} from "./sync.services";

export const syncStatusKey = ["neot", "sync", "status"] as const;
export const syncTokensKey = ["neot", "sync", "tokens"] as const;

export function useSyncStatus() {
  return useQuery({
    queryFn: getSyncStatus,
    queryKey: syncStatusKey,
    refetchOnWindowFocus: false
  });
}

export function useSyncTokens(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: getSyncTokens,
    queryKey: syncTokensKey,
    refetchOnWindowFocus: false
  });
}

export function useSyncActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: syncStatusKey });
  const refreshTokens = () => client.invalidateQueries({ queryKey: syncTokensKey });
  return {
    bind: useMutation({
      mutationFn: ({ instanceId, token }: { instanceId: string; token: string }) =>
        bindSyncCloud(instanceId, token),
      onSuccess: refresh
    }),
    disconnect: useMutation({ mutationFn: disconnectSyncCloud, onSuccess: refresh }),
    generate: useMutation({ mutationFn: generateSyncToken, onSuccess: refreshTokens }),
    publish: useMutation({
      mutationFn: publishSyncCloud,
      onSuccess: refresh
    }),
    pull: useMutation({
      mutationFn: pullSyncCloud,
      onSuccess: refresh
    }),
    revoke: useMutation({ mutationFn: revokeSyncToken, onSuccess: refreshTokens }),
    verify: useMutation({ mutationFn: verifySyncCloud, onSuccess: refresh })
  };
}
