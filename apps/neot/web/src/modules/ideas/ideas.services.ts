import {
  apiAbsoluteUrl,
  apiBinaryPost,
  apiDelete,
  apiGet,
  apiPost,
  apiPut
} from "../../shared/api/neot-api";
import type {
  Idea,
  IdeaAttachment,
  IdeaComment,
  IdeaInput,
  IdeaPoll,
  IdeaScene,
  IdeaUser
} from "./ideas.types";

export const listIdeas = async () => (await apiGet<Idea[]>("/ideas")).map(resolveIdeaImages);
export const listIdeaUsers = () => apiGet<IdeaUser[]>("/ideas/users");
export const getIdea = async (uuid: string) =>
  resolveIdeaImages(await apiGet<Idea>(`/ideas/${uuid}`));
export const createIdea = (input: IdeaInput) => apiPost<Idea>("/ideas", input);
export const updateIdea = (uuid: string, input: Partial<IdeaInput>) =>
  apiPut<Idea>(`/ideas/${uuid}`, input);
export const deleteIdea = (uuid: string) =>
  apiDelete<{ deleted: true; uuid: string }>(`/ideas/${uuid}`);
export const listIdeaComments = (uuid: string) => apiGet<IdeaComment[]>(`/ideas/${uuid}/comments`);
export const createIdeaComment = (uuid: string, bodyHtml: string, parentUuid: string | null) =>
  apiPost<IdeaComment>(`/ideas/${uuid}/comments`, { bodyHtml, parentUuid });
export const toggleIdeaLike = (uuid: string) =>
  apiPost<{ liked: boolean; likes: number }>(`/ideas/${uuid}/like`);
export const toggleIdeaReaction = (uuid: string, vote: "down" | "up") =>
  apiPost<{ downvotes: number; upvotes: number; vote: "down" | "up" }>(`/ideas/${uuid}/reaction`, {
    vote
  });
export const toggleCommentLike = (uuid: string) =>
  apiPost<{ liked: boolean; likes: number }>(`/idea-comments/${uuid}/like`);
export const toggleCommentReaction = (uuid: string, vote: "down" | "up") =>
  apiPost<{ downvotes: number; upvotes: number; vote: "down" | "up" }>(
    `/idea-comments/${uuid}/reaction`,
    { vote }
  );
export const saveIdeaPoll = (
  uuid: string,
  input: { multipleChoice: boolean; options: string[]; question: string }
) => apiPut<IdeaPoll>(`/ideas/${uuid}/poll`, input);
export const voteIdeaPoll = (uuid: string, optionId: string) =>
  apiPost<IdeaPoll>(`/ideas/${uuid}/poll/votes`, { optionId });
export async function uploadIdeaAttachment(uuid: string, file: File) {
  const attachment = await apiBinaryPost<IdeaAttachment>(`/ideas/${uuid}/attachments`, file, {
    "X-File-Name": encodeURIComponent(file.name),
    "X-File-Type": file.type
  });
  return {
    ...attachment,
    dataUrl: resolveAttachmentUrl(attachment.dataUrl),
    url: resolveAttachmentUrl(attachment.url)
  };
}
export const saveIdeaDrawing = (uuid: string, scene: IdeaScene) =>
  apiPut<{ scene: IdeaScene }>(`/ideas/${uuid}/drawing`, scene);

function resolveIdeaImages(idea: Idea): Idea {
  const attachments = idea.attachments.map((attachment) => ({
    ...attachment,
    dataUrl: resolveAttachmentUrl(attachment.dataUrl),
    url: resolveAttachmentUrl(attachment.url)
  }));
  return {
    ...idea,
    attachments,
    contentHtml: refreshInlineImageUrls(idea.contentHtml, attachments)
  };
}

function resolveAttachmentUrl(url: string) {
  return url.startsWith("/") ? apiAbsoluteUrl(url) : url;
}

function refreshInlineImageUrls(contentHtml: string, attachments: IdeaAttachment[]) {
  if (!contentHtml.includes("<img") || !attachments.length) return contentHtml;
  const document = new DOMParser().parseFromString(contentHtml, "text/html");
  const attachmentByPath = new Map(
    attachments.map((attachment) => [new URL(attachment.url).pathname, attachment.url])
  );
  document.querySelectorAll("img[src]").forEach((image) => {
    const source = image.getAttribute("src");
    if (!source) return;
    const replacement = attachmentByPath.get(new URL(source, window.location.origin).pathname);
    if (replacement) image.setAttribute("src", replacement);
  });
  return document.body.innerHTML;
}
