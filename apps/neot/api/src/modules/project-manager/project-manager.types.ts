export type ProjectManagerKind =
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

export type ProjectManagerRecord = {
  active: boolean;
  assignee: string;
  createdAt: string;
  description: string;
  dueDate: string;
  id: string;
  key: string;
  kind: ProjectManagerKind;
  lane: string;
  logoText: string;
  colorKey: string;
  repositoryName: string;
  repositoryUrl: string;
  moduleKey: string;
  priority: "critical" | "high" | "low" | "medium";
  referenceId: string;
  referenceType: string;
  sortOrder: number;
  startDate: string;
  status: string;
  title: string;
  type: string;
  updatedAt: string;
};

export type ProjectManagerAttachment = {
  checksum: string;
  createdAt: string;
  createdBy: string;
  id: string;
  mimeType: string;
  originalName: string;
  recordId: string;
  recordKind: ProjectManagerAttachmentKind;
  sizeBytes: number;
  storageKey: string;
};

export type ProjectManagerAttachmentKind = "activity" | "issue" | "project" | "review" | "task";

export type ProjectManagerAttachmentCreate = Omit<ProjectManagerAttachment, "createdAt">;

export type ProjectManagerAttachmentSummary = Omit<ProjectManagerAttachment, "storageKey">;

export type OptionalInput<T> = {
  [Key in keyof T]?: T[Key] | undefined;
};

export type ProjectManagerSavePayload = OptionalInput<
  Omit<ProjectManagerRecord, "createdAt" | "id" | "kind" | "updatedAt">
> & {
  key: string;
  title: string;
};

export type ProjectManagerUpdatePayload = OptionalInput<ProjectManagerSavePayload>;

export type ProjectManagerResult = {
  generatedAt: string;
  records: Record<ProjectManagerKind, ProjectManagerRecord[]>;
  summary: {
    active: number;
    blocked: number;
    completed: number;
    total: number;
  };
};

export type ProjectManagerRegistryPlatform = {
  active: boolean;
  createdAt: string;
  description: string;
  id: string;
  key: string;
  name: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type ProjectManagerRegistryGroup = {
  active: boolean;
  createdAt: string;
  description: string;
  id: string;
  key: string;
  name: string;
  parentGroupId: string;
  platformId: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type ProjectManagerRegistryModule = {
  active: boolean;
  createdAt: string;
  description: string;
  documentation: Record<string, ProjectManagerDocumentationRow[]>;
  groupId: string;
  id: string;
  key: string;
  moduleType: "area" | "module" | "page";
  name: string;
  parentModuleId: string;
  planningNotes: ProjectManagerPlanningNote[];
  routePath: string;
  sortOrder: number;
  status: string;
  updatedAt: string;
};

export type ProjectManagerDocumentationRow = {
  createdAt: string;
  id: string;
  key: string;
  updatedAt: string;
  value: string;
};
export type ProjectManagerPlanningNote = {
  body: string;
  createdAt: string;
  id: string;
  title: string;
  updatedAt: string;
};

export type ProjectManagerRegistryModuleNode = ProjectManagerRegistryModule & {
  children: ProjectManagerRegistryModuleNode[];
};

export type ProjectManagerRegistryGroupNode = ProjectManagerRegistryGroup & {
  modules: ProjectManagerRegistryModuleNode[];
  subGroups: ProjectManagerRegistryGroupNode[];
};

export type ProjectManagerRegistryPlatformNode = ProjectManagerRegistryPlatform & {
  groups: ProjectManagerRegistryGroupNode[];
};

export type ProjectManagerRegistryResult = {
  generatedAt: string;
  platforms: ProjectManagerRegistryPlatformNode[];
  summary: {
    activeGroups: number;
    activeModules: number;
    platforms: number;
    totalGroups: number;
    totalModules: number;
  };
};

export type ProjectManagerRegistrySavePayload = {
  active?: boolean | undefined;
  description?: string | undefined;
  documentation?: Record<string, ProjectManagerDocumentationRow[]> | undefined;
  groupId?: string | undefined;
  key: string;
  moduleType?: ProjectManagerRegistryModule["moduleType"] | undefined;
  name: string;
  parentGroupId?: string | undefined;
  parentModuleId?: string | undefined;
  planningNotes?: ProjectManagerPlanningNote[] | undefined;
  platformId?: string | undefined;
  routePath?: string | undefined;
  sortOrder?: number | undefined;
  status?: string | undefined;
};

export type ProjectManagerRegistryUpdatePayload = OptionalInput<ProjectManagerRegistrySavePayload>;
