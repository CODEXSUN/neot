import { apiGet, apiPost, apiPut } from "../../shared/api/neot-api";
import type {
  LearningAttempt,
  LearningCourse,
  LearningCoursePayload,
  LearningDiscussionPost,
  LearningSnapshot
} from "./learning.types";

export const getLearningSnapshot = () => apiGet<LearningSnapshot>("/learning/snapshot");
export const createLearningRecord = (resource: string, payload: Record<string, unknown>) =>
  apiPost(`/learning/${resource}`, payload);
export const createLearningCourse = (payload: LearningCoursePayload) =>
  apiPost<LearningCourse>("/learning/courses", payload);
export const updateLearningCourse = (courseUuid: string, payload: LearningCoursePayload) =>
  apiPut<LearningCourse>(`/learning/courses/${courseUuid}`, payload);
export const getLessonDiscussion = (lessonUuid: string) =>
  apiGet<LearningDiscussionPost[]>(`/learning/lessons/${lessonUuid}/discussion`);
export const addLessonDiscussionPost = (
  lessonUuid: string,
  body: string,
  parentUuid: string | null
) =>
  apiPost<LearningDiscussionPost>(`/learning/lessons/${lessonUuid}/discussion`, {
    body,
    parentUuid
  });
export const addQuizQuestion = (testUuid: string, payload: Record<string, unknown>) =>
  apiPost(`/learning/tests/${testUuid}/questions`, payload);
export const deriveQuizFromQAndA = (testUuid: string) =>
  apiPost<{ created: number; eligible: number; testUuid: string }>(
    `/learning/tests/${testUuid}/derive-from-q-and-a`
  );
export const submitQuizAttempt = (testUuid: string, answers: Record<string, string>) =>
  apiPost<LearningAttempt>(`/learning/tests/${testUuid}/attempts`, { answers });
