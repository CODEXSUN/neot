import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPlanningBoard,
  createPlanningComment,
  deletePlanningBoard,
  getPlanningBoard,
  listPlanningBoards,
  listPlanningComments,
  setPlanningCommentStatus,
  togglePlanningReaction,
  updatePlanningBoard,
} from "./planning.services";
import type { PlanningRecordKind } from "./planning.types";

const boardsKey = ["neot", "planning", "boards"] as const;
export const usePlanningBoards = (record?: {
  kind: PlanningRecordKind;
  uuid: string;
}) =>
  useQuery({
    queryKey: [...boardsKey, record?.kind ?? "all", record?.uuid ?? "all"],
    queryFn: () => listPlanningBoards(record),
  });
export const usePlanningBoard = (uuid: string) =>
  useQuery({
    queryKey: [...boardsKey, uuid],
    queryFn: () => getPlanningBoard(uuid),
    enabled: Boolean(uuid),
  });
export function usePlanningActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: boardsKey });
  return {
    create: useMutation({
      mutationFn: createPlanningBoard,
      onSuccess: refresh,
    }),
    delete: useMutation({
      mutationFn: deletePlanningBoard,
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({
        uuid,
        input,
      }: {
        uuid: string;
        input: Parameters<typeof updatePlanningBoard>[1];
      }) => updatePlanningBoard(uuid, input),
      onSuccess: (board) => {
        client.setQueryData([...boardsKey, board.uuid], board);
        return client.invalidateQueries({ exact: true, queryKey: boardsKey });
      },
    }),
  };
}

export function usePlanningComments(uuid: string) {
  const client = useQueryClient();
  const key = [...boardsKey, uuid, "comments"] as const;
  const refresh = () => client.invalidateQueries({ queryKey: key });
  return {
    query: useQuery({
      enabled: Boolean(uuid),
      queryFn: () => listPlanningComments(uuid),
      queryKey: key,
    }),
    create: useMutation({
      mutationFn: (input: { body: string; elementId?: string }) =>
        createPlanningComment(uuid, input),
      onSuccess: refresh,
    }),
    resolve: useMutation({
      mutationFn: ({
        commentUuid,
        resolved,
      }: {
        commentUuid: string;
        resolved: boolean;
      }) => setPlanningCommentStatus(commentUuid, resolved),
      onSuccess: refresh,
    }),
    react: useMutation({
      mutationFn: ({
        commentUuid,
        reaction,
      }: {
        commentUuid: string;
        reaction: string;
      }) => togglePlanningReaction(commentUuid, reaction),
      onSuccess: refresh,
    }),
  };
}
