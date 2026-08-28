import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPlatformRegistryResult,
  savePlatformRegistryGroup,
  savePlatformRegistryModule,
  savePlatformRegistryPlatform,
  setPlatformRegistryActive
} from "./platform-registry.services";

const queryKey = ["admin", "project-manager", "registry"] as const;

export function usePlatformRegistryQuery() {
  return useQuery({ queryFn: getPlatformRegistryResult, queryKey });
}

export function usePlatformRegistryMutations() {
  const queryClient = useQueryClient();
  const done = () => queryClient.invalidateQueries({ queryKey });
  return {
    saveGroup: useMutation({ mutationFn: savePlatformRegistryGroup, onSuccess: done }),
    saveModule: useMutation({ mutationFn: savePlatformRegistryModule, onSuccess: done }),
    savePlatform: useMutation({ mutationFn: savePlatformRegistryPlatform, onSuccess: done }),
    setActive: useMutation({
      mutationFn: ({
        active,
        id,
        kind
      }: {
        active: boolean;
        id: string;
        kind: "groups" | "modules" | "platforms";
      }) => setPlatformRegistryActive(kind, id, active),
      onSuccess: done
    })
  };
}
