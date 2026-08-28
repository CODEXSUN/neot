import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as service from "./ideas.services";

const key = ["neot", "ideas"] as const;
export const useIdeas = () => useQuery({ queryKey: key, queryFn: service.listIdeas });
export const useIdeaUsers = () =>
  useQuery({ queryKey: [...key, "users"], queryFn: service.listIdeaUsers, staleTime: 30_000 });
export const useIdea = (uuid: string) =>
  useQuery({
    queryKey: [...key, uuid],
    queryFn: () => service.getIdea(uuid),
    enabled: Boolean(uuid)
  });
export const useIdeaComments = (uuid: string) =>
  useQuery({
    queryKey: [...key, uuid, "comments"],
    queryFn: () => service.listIdeaComments(uuid),
    enabled: Boolean(uuid)
  });
export function useIdeaActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: key });
  return {
    create: useMutation({ mutationFn: service.createIdea, onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({
        uuid,
        input
      }: {
        uuid: string;
        input: Parameters<typeof service.updateIdea>[1];
      }) => service.updateIdea(uuid, input),
      onSuccess: refresh
    }),
    remove: useMutation({ mutationFn: service.deleteIdea, onSuccess: refresh }),
    comment: useMutation({
      mutationFn: ({
        uuid,
        bodyHtml,
        parentUuid
      }: {
        uuid: string;
        bodyHtml: string;
        parentUuid: string | null;
      }) => service.createIdeaComment(uuid, bodyHtml, parentUuid),
      onSuccess: refresh
    }),
    like: useMutation({ mutationFn: service.toggleIdeaLike, onSuccess: refresh }),
    reactIdea: useMutation({
      mutationFn: ({ uuid, vote }: { uuid: string; vote: "down" | "up" }) =>
        service.toggleIdeaReaction(uuid, vote),
      onSuccess: refresh
    }),
    reactComment: useMutation({
      mutationFn: ({ uuid, vote }: { uuid: string; vote: "down" | "up" }) =>
        service.toggleCommentReaction(uuid, vote),
      onSuccess: refresh
    }),
    poll: useMutation({
      mutationFn: ({
        uuid,
        input
      }: {
        uuid: string;
        input: Parameters<typeof service.saveIdeaPoll>[1];
      }) => service.saveIdeaPoll(uuid, input),
      onSuccess: refresh
    }),
    vote: useMutation({
      mutationFn: ({ uuid, optionId }: { uuid: string; optionId: string }) =>
        service.voteIdeaPoll(uuid, optionId),
      onSuccess: refresh
    }),
    attach: useMutation({
      mutationFn: ({ uuid, file }: { uuid: string; file: File }) =>
        service.uploadIdeaAttachment(uuid, file),
      onSuccess: refresh
    }),
    drawing: useMutation({
      mutationFn: ({
        uuid,
        scene
      }: {
        uuid: string;
        scene: Parameters<typeof service.saveIdeaDrawing>[1];
      }) => service.saveIdeaDrawing(uuid, scene),
      onSuccess: refresh
    })
  };
}
