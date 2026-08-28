import { apiGet, apiPost, apiPut } from "../../shared/api/neot-api";
import type {
  ProjectManagerRegistryGroup,
  ProjectManagerRegistryModule,
  ProjectManagerRegistryPlatform,
  ProjectManagerRegistryResult,
} from "../project-manager/project-manager.types";

export function getPlatformRegistryResult() {
  return apiGet<ProjectManagerRegistryResult>(
    "/admin/project-manager/registry/result",
    "dev",
  );
}

export function savePlatformRegistryPlatform(
  payload: Partial<ProjectManagerRegistryPlatform> & {
    key: string;
    name: string;
  },
) {
  return payload.id
    ? apiPut<ProjectManagerRegistryPlatform>(
        `/admin/project-manager/registry/platforms/${payload.id}`,
        payload,
        "dev",
      )
    : apiPost<ProjectManagerRegistryPlatform>(
        "/admin/project-manager/registry/platforms",
        payload,
        "dev",
      );
}

export function savePlatformRegistryGroup(
  payload: Partial<ProjectManagerRegistryGroup> & {
    key: string;
    name: string;
    platformId: string;
  },
) {
  return payload.id
    ? apiPut<ProjectManagerRegistryGroup>(
        `/admin/project-manager/registry/groups/${payload.id}`,
        payload,
        "dev",
      )
    : apiPost<ProjectManagerRegistryGroup>(
        "/admin/project-manager/registry/groups",
        payload,
        "dev",
      );
}

export function savePlatformRegistryModule(
  payload: Partial<ProjectManagerRegistryModule> & {
    groupId: string;
    key: string;
    name: string;
  },
) {
  return payload.id
    ? apiPut<ProjectManagerRegistryModule>(
        `/admin/project-manager/registry/modules/${payload.id}`,
        payload,
        "dev",
      )
    : apiPost<ProjectManagerRegistryModule>(
        "/admin/project-manager/registry/modules",
        payload,
        "dev",
      );
}

export function setPlatformRegistryActive(
  kind: "groups" | "modules" | "platforms",
  id: string,
  active: boolean,
) {
  return apiPost<
    | ProjectManagerRegistryGroup
    | ProjectManagerRegistryModule
    | ProjectManagerRegistryPlatform
  >(
    `/admin/project-manager/registry/${kind}/${id}/${active ? "restore" : "deactivate"}`,
    {},
    "dev",
  );
}
