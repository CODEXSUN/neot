import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from "../../shared/api/neot-api";
import type {
  PlanningBoard,
  PlanningComment,
  PlanningRecordKind,
  PlanningScene,
} from "./planning.types";

export const listPlanningBoards = (record?: {
  kind: PlanningRecordKind;
  uuid: string;
}) =>
  apiGet<PlanningBoard[]>(
    `/planning/boards${
      record
        ? `?recordKind=${encodeURIComponent(record.kind)}&recordUuid=${encodeURIComponent(record.uuid)}`
        : ""
    }`,
  );
export const getPlanningBoard = (uuid: string) =>
  apiGet<PlanningBoard>(`/planning/boards/${uuid}`);
export const createPlanningBoard = (input: {
  description: string;
  projectUuid: string | null;
  recordKind?: PlanningRecordKind;
  recordUuid?: string;
  title: string;
}) => apiPost<PlanningBoard>("/planning/boards", input);
export const updatePlanningBoard = (
  uuid: string,
  input: {
    scene?: PlanningScene;
    title?: string;
    description?: string;
    projectUuid?: string | null;
  },
) => apiPut<PlanningBoard>(`/planning/boards/${uuid}`, input);
export const deletePlanningBoard = (uuid: string) =>
  apiDelete<{ deleted: true; uuid: string }>(`/planning/boards/${uuid}`);
export const listPlanningComments = (uuid: string) =>
  apiGet<PlanningComment[]>(`/planning/boards/${uuid}/comments`);
export const createPlanningComment = (
  uuid: string,
  input: { body: string; elementId?: string },
) => apiPost<PlanningComment>(`/planning/boards/${uuid}/comments`, input);
export const setPlanningCommentStatus = (
  uuid: string,
  resolved: boolean,
) =>
  apiPut<PlanningComment>(`/planning/comments/${uuid}/status`, { resolved });
export const togglePlanningReaction = (uuid: string, reaction: string) =>
  apiPost<PlanningComment>(`/planning/comments/${uuid}/reactions`, {
    reaction,
  });
