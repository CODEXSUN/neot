export type IdeaInput = {
  assigneeUuids: string[];
  category: string;
  categoryColor: string;
  contentHtml: string;
  excerpt: string;
  projectUuids: string[];
  status: string;
  statusColor: string;
  tags: string[];
  title: string;
  visibility: "private" | "public";
};

export type PollInput = { multipleChoice: boolean; options: string[]; question: string };
