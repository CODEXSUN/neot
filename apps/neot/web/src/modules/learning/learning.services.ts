import { apiGet, apiPost } from "../../shared/api/neot-api";
import type { LearningAttempt, LearningSnapshot } from "./learning.types";

export const getLearningSnapshot = () => apiGet<LearningSnapshot>("/learning/snapshot");
export const createLearningRecord = (resource: string, payload: Record<string, unknown>) =>
  apiPost(`/learning/${resource}`, payload);
export const addQuizQuestion = (testUuid: string, payload: Record<string, unknown>) =>
  apiPost(`/learning/tests/${testUuid}/questions`, payload);
export const submitQuizAttempt = (testUuid: string, answers: Record<string, string>) =>
  apiPost<LearningAttempt>(`/learning/tests/${testUuid}/attempts`, { answers });
