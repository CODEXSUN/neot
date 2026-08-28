export type IdeaAttachment = {
  dataUrl: string;
  ideaUuid: string;
  mimeType: string;
  name: string;
  sizeBytes: number;
  url: string;
  uuid: string;
};
export type IdeaPoll = {
  multipleChoice: boolean;
  options: Array<{ id: string; label: string; votes: number }>;
  question: string;
  uuid: string;
};
export type Idea = {
  assigneeUuids: string[];
  attachments: IdeaAttachment[];
  author: string;
  category: string;
  categoryColor: string;
  commentCount: number;
  contentHtml: string;
  createdAt: string;
  dislikes: number;
  drawing: IdeaScene | null;
  excerpt: string;
  likes: number;
  poll: IdeaPoll | null;
  projectUuids: string[];
  referenceNumber: number;
  replyCount: number;
  status: string;
  statusColor: string;
  tags: string[];
  title: string;
  updatedAt: string;
  uuid: string;
  visibility: "private" | "public";
};
export type IdeaUser = {
  email: string;
  id: number;
  name: string;
  uuid: string;
};
export type IdeaComment = {
  author: string;
  bodyHtml: string;
  createdAt: string;
  dislikes: number;
  ideaUuid: string;
  likes: number;
  parentUuid: string | null;
  updatedAt: string;
  uuid: string;
};
export type IdeaScene = {
  appState?: Record<string, unknown>;
  elements: unknown[];
  files?: Record<string, unknown>;
};
export type IdeaInput = Pick<
  Idea,
  | "category"
  | "assigneeUuids"
  | "categoryColor"
  | "contentHtml"
  | "excerpt"
  | "projectUuids"
  | "status"
  | "statusColor"
  | "tags"
  | "title"
  | "visibility"
>;
