import type {
  ProjectManagerRegistryGroup,
  ProjectManagerRegistryModule,
  ProjectManagerRegistryPlatform
} from "../project-manager/project-manager.types";

export type PlatformRegistryKind = "group" | "module" | "platform";

export type PlatformRegistryFormPayload = {
  active?: boolean | undefined;
  description?: string | undefined;
  key: string;
  name: string;
  parentId?: string | undefined;
  status?: string | undefined;
};

export type PlatformRegistryRow =
  | (ProjectManagerRegistryPlatform & { kind: "platform"; parentName?: string })
  | (ProjectManagerRegistryGroup & { kind: "group"; parentName?: string })
  | (ProjectManagerRegistryModule & { kind: "module"; parentName?: string });
