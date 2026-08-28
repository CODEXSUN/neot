import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addQuizQuestion,
  addLessonDiscussionPost,
  createLearningCourse,
  createLearningRecord,
  deriveQuizFromQAndA,
  getLearningSnapshot,
  getLessonDiscussion,
  submitQuizAttempt,
  updateLearningCourse
} from "./learning.services";
import type { LearningCoursePayload } from "./learning.types";

const learningKey = ["neot", "learning"] as const;
export const useLearningSnapshot = () =>
  useQuery({ queryFn: getLearningSnapshot, queryKey: learningKey });

export function useLessonDiscussion(lessonUuid: string) {
  const client = useQueryClient();
  const queryKey = [...learningKey, "lessons", lessonUuid, "discussion"] as const;
  return {
    add: useMutation({
      mutationFn: ({ body, parentUuid }: { body: string; parentUuid: string | null }) =>
        addLessonDiscussionPost(lessonUuid, body, parentUuid),
      onSuccess: () => void client.invalidateQueries({ queryKey })
    }),
    query: useQuery({
      enabled: Boolean(lessonUuid),
      queryFn: () => getLessonDiscussion(lessonUuid),
      queryKey
    })
  };
}

export function useLearningMutations() {
  const client = useQueryClient();
  const refresh = () => void client.invalidateQueries({ queryKey: learningKey });
  return {
    addQuestion: useMutation({
      mutationFn: ({ payload, testUuid }: { payload: Record<string, unknown>; testUuid: string }) =>
        addQuizQuestion(testUuid, payload),
      onSuccess: refresh
    }),
    create: useMutation({
      mutationFn: ({ payload, resource }: { payload: Record<string, unknown>; resource: string }) =>
        createLearningRecord(resource, payload),
      onSuccess: refresh
    }),
    createCourse: useMutation({
      mutationFn: (payload: LearningCoursePayload) => createLearningCourse(payload),
      onSuccess: refresh
    }),
    deriveQuiz: useMutation({
      mutationFn: (testUuid: string) => deriveQuizFromQAndA(testUuid),
      onSuccess: refresh
    }),
    submit: useMutation({
      mutationFn: ({ answers, testUuid }: { answers: Record<string, string>; testUuid: string }) =>
        submitQuizAttempt(testUuid, answers),
      onSuccess: refresh
    }),
    updateCourse: useMutation({
      mutationFn: ({
        courseUuid,
        payload
      }: {
        courseUuid: string;
        payload: LearningCoursePayload;
      }) => updateLearningCourse(courseUuid, payload),
      onSuccess: refresh
    })
  };
}
