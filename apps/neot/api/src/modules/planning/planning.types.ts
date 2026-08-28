export type PlanningScene = {
  appState?: Record<string, unknown> | undefined;
  elements: unknown[];
  files?: Record<string, unknown> | undefined;
};

export type PlanningBoard = {
  createdAt: string;
  createdBy: string;
  description: string;
  projectUuid: string | null;
  scene: PlanningScene;
  status: string;
  title: string;
  updatedAt: string;
  updatedBy: string;
  uuid: string;
  syncVersion: number;
};

export type PlanningRecordKind =
  | "project"
  | "issue"
  | "task"
  | "activity"
  | "review";

export type PlanningReaction = {
  createdBy: string;
  reaction: string;
  uuid: string;
};

export type PlanningComment = {
  body: string;
  createdAt: string;
  createdBy: string;
  elementId: string | null;
  mentions: string[];
  reactions: PlanningReaction[];
  resolvedAt: string | null;
  resolvedBy: string | null;
  status: "open" | "resolved";
  updatedAt: string;
  uuid: string;
};
