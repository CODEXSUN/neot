import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProjectManagerRecord,
  deactivateProjectManagerRecord,
  deleteProjectManagerRecord,
  getProjectManagerResult,
  listProjectManagerRecords,
  restoreProjectManagerRecord,
  updateProjectManagerRecord
} from "./project-manager.services";
import type { ProjectManagerKind } from "./project-manager.types";

export const projectManagerQueryKey = ["admin", "project-manager"] as const;

export function useProjectManagerResultQuery() {
  return useQuery({
    queryFn: getProjectManagerResult,
    queryKey: [...projectManagerQueryKey, "result"]
  });
}

export function useProjectManagerRecordsQuery(kind: ProjectManagerKind) {
  return useQuery({
    queryFn: () => listProjectManagerRecords(kind),
    queryKey: [...projectManagerQueryKey, kind]
  });
}

export function useProjectManagerMutations(kind: ProjectManagerKind) {
  const client = useQueryClient();
  const done = () => void client.invalidateQueries({ queryKey: projectManagerQueryKey });
  return {
    create: useMutation({
      mutationFn: (payload: Record<string, unknown>) => createProjectManagerRecord(kind, payload),
      onSuccess: done
    }),
    deactivate: useMutation({
      mutationFn: (id: string) => deactivateProjectManagerRecord(kind, id),
      onSuccess: done
    }),
    delete: useMutation({
      mutationFn: (id: string) => deleteProjectManagerRecord(kind, id),
      onSuccess: done
    }),
    restore: useMutation({
      mutationFn: (id: string) => restoreProjectManagerRecord(kind, id),
      onSuccess: done
    }),
    update: useMutation({
      mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
        updateProjectManagerRecord(kind, id, payload),
      onSuccess: done
    })
  };
}
