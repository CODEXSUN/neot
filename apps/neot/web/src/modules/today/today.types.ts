export type TodayRecordKind =
  | "activity"
  | "discussion"
  | "issue"
  | "kanban"
  | "project"
  | "release"
  | "review"
  | "task"
  | "timeline"
  | "todo";

export type TodayRecord = {
  active: boolean;
  assignee: string;
  dueDate: string;
  id: string;
  key: string;
  kind: TodayRecordKind;
  priority: "critical" | "high" | "low" | "medium";
  referenceId: string;
  referenceType: string;
  status: string;
  title: string;
  type: string;
};

export type TodayProjectManagerResult = {
  generatedAt: string;
  records: Record<TodayRecordKind, TodayRecord[]>;
};

export type TodayDashboard = {
  blockedIssues: TodayRecord[];
  dueTodayTasks: TodayRecord[];
  failedChecks: TodayRecord[];
  generatedAt: string;
  overdueTasks: TodayRecord[];
  upcomingReleases: TodayRecord[];
  waitingReviews: TodayRecord[];
};
