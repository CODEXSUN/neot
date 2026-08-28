import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addQuizQuestion,
  createLearningRecord,
  getLearningSnapshot,
  submitQuizAttempt
} from "./learning.services";

const learningKey = ["neot", "learning"] as const;
export const useLearningSnapshot = () =>
  useQuery({ queryFn: getLearningSnapshot, queryKey: learningKey });

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
    submit: useMutation({
      mutationFn: ({ answers, testUuid }: { answers: Record<string, string>; testUuid: string }) =>
        submitQuizAttempt(testUuid, answers),
      onSuccess: refresh
    })
  };
}
