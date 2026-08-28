import { useState } from "react";
import { ArrowLeftIcon, PlusIcon, RefreshCwIcon, SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import { WorkspacePage } from "@neot/ui/workspace/page";
import { WorkspaceSelect } from "@neot/ui/workspace/select";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormGrid
} from "@neot/ui/workspace/upsert";
import { usePlatformRegistryMutations, usePlatformRegistryQuery } from "./platform-registry.hooks";
import {
  AppList,
  ModuleGroupList,
  ModuleGroupModuleList,
  ModuleList,
  PlatformList
} from "./platform-registry.list";
import { PlatformRegistryModuleShow } from "./platform-registry.show";
import type {
  ProjectManagerRecord,
  ProjectManagerRegistryGroupNode,
  ProjectManagerRegistryModuleNode,
  ProjectManagerRegistryPlatformNode
} from "../project-manager/project-manager.types";

type EditMode = "group" | "module" | "platform";
type EditForm = {
  active?: boolean;
  description: string;
  groupId?: string;
  id?: string;
  key: string;
  moduleType?: "area" | "module" | "page";
  name: string;
  parentGroupId?: string;
  parentModuleId?: string;
  platformId?: string;
  routePath?: string;
  sortOrder: string;
  status: string;
};
type RegistrySavePayload = {
  active?: boolean;
  description: string;
  groupId?: string;
  id?: string;
  key: string;
  moduleType?: "area" | "module" | "page";
  name: string;
  parentGroupId?: string;
  parentModuleId?: string;
  platformId?: string;
  routePath?: string;
  sortOrder: number;
  status: string;
};

export function PlatformRegistryWorkspace({
  embedded = false,
  project
}: {
  embedded?: boolean;
  project?: ProjectManagerRecord;
} = {}) {
  const registry = usePlatformRegistryQuery();
  const mutations = usePlatformRegistryMutations();
  const [platformId, setPlatformId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [editMode, setEditMode] = useState<EditMode>("platform");
  const [form, setForm] = useState<EditForm | null>(null);
  const [error, setError] = useState("");
  const allPlatforms = registry.data?.platforms ?? [];
  const projectPlatform = project
    ? allPlatforms.find((platform) => platform.key === projectArchitectKey(project)) ?? null
    : null;
  const platforms = project
    ? projectPlatform
      ? [projectPlatform]
      : []
    : allPlatforms.filter((platform) => !isProjectArchitectPlatform(platform.key));
  const selectedPlatform = project
    ? projectPlatform
    : platforms.find((platform) => platform.id === platformId) ?? null;
  const groups = selectedPlatform?.groups ?? [];
  const groupOptions = flattenGroups(groups);
  const selectedGroup = groupOptions.find((group) => group.id === groupId) ?? null;
  const isFlattenedTenantApps =
    selectedPlatform?.id === "platform-tenant" && selectedGroup?.id === "group-tenant-apps";
  const modules = selectedGroup?.modules ?? [];
  const moduleOptions = flattenModules(modules);
  const selectedModule = moduleOptions.find((module) => module.id === moduleId) ?? null;
  const childModules = selectedModule?.children ?? [];
  const isAppModuleGroups =
    selectedModule?.id === "module-app-application" || selectedModule?.id === "module-app-billing";
  const isAppsRoot = isFlattenedTenantApps && !selectedModule;
  const isModuleShow = Boolean(selectedModule && childModules.length === 0 && !form);
  const level = selectedModule
    ? "submodule"
    : selectedGroup
      ? "module"
      : selectedPlatform
        ? "group"
        : project
          ? "project"
          : "platform";
  const busy =
    registry.isFetching ||
    mutations.savePlatform.isPending ||
    mutations.saveGroup.isPending ||
    mutations.saveModule.isPending ||
    mutations.setActive.isPending;

  function openPlatform(platform?: ProjectManagerRegistryPlatformNode) {
    setPlatformId(platform?.id ?? "");
    const tenantApps =
      platform?.id === "platform-tenant"
        ? platform.groups.find((group) => group.id === "group-tenant-apps")
        : undefined;
    setGroupId(tenantApps?.id ?? "");
    setModuleId("");
    setForm(null);
  }

  function editPlatform(platform?: ProjectManagerRegistryPlatformNode) {
    setEditMode("platform");
    setForm(
      platform
        ? formFromPlatform(platform)
        : { description: "", key: "", name: "", sortOrder: "0", status: "active" }
    );
  }

  function editGroup(group?: ProjectManagerRegistryGroupNode) {
    setEditMode("group");
    setForm(
      group
        ? formFromGroup(group)
        : {
            description: "",
            key: "",
            name: "",
            parentGroupId: "",
            platformId: selectedPlatform?.id ?? "",
            sortOrder: "0",
            status: "active"
          }
    );
  }

  function editModule(module?: ProjectManagerRegistryModuleNode) {
    setEditMode("module");
    setForm(
      module
        ? formFromModule(module)
        : {
            description: "",
            groupId: selectedGroup?.id ?? "",
            key: "",
            moduleType: "module",
            name: "",
            parentModuleId: selectedModule?.id ?? "",
            routePath: "",
            sortOrder: "0",
            status: "active"
          }
    );
  }

  function goBack() {
    setForm(null);
    if (selectedModule) return setModuleId(selectedModule.parentModuleId || "");
    if (isFlattenedTenantApps) return openPlatform();
    if (selectedGroup) return setGroupId("");
    if (project) return;
    if (selectedPlatform) openPlatform();
  }

  async function initializeProjectArchitect() {
    if (!project) return;
    try {
      await mutations.savePlatform.mutateAsync({
        description: `Architecture registry for ${project.title}.`,
        key: projectArchitectKey(project),
        name: project.title,
        sortOrder: 0,
        status: "active"
      });
      toast.success("Project Architect is ready");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Project Architect setup failed.");
    }
  }

  function save() {
    if (!form?.key.trim() || !form.name.trim()) {
      setError("Key and name are required.");
      return;
    }
    setError("");
    const payload = payloadFromForm(form);
    const action =
      editMode === "platform"
        ? mutations.savePlatform.mutateAsync(payload)
        : editMode === "group"
          ? mutations.saveGroup.mutateAsync(payload as RegistrySavePayload & { platformId: string })
          : mutations.saveModule.mutateAsync(payload as RegistrySavePayload & { groupId: string });
    action
      .then((record) => {
        toast.success("Registry saved", { description: record.name });
        setForm(null);
      })
      .catch((value) => setError(value instanceof Error ? value.message : "Save failed."));
  }

  if (selectedModule && isModuleShow) {
    const parent = moduleOptions.find((module) => module.id === selectedModule.parentModuleId);
    return (
      <PlatformRegistryModuleShow
        embedded={embedded}
        busy={busy}
        module={selectedModule}
        parentName={parent?.name ?? selectedGroup?.name ?? ""}
        onBack={goBack}
        onRefresh={() => void registry.refetch()}
        onToggle={() =>
          mutations.setActive.mutate({
            active: !selectedModule.active,
            id: selectedModule.id,
            kind: "modules"
          })
        }
        onUpdate={(patch) => mutations.saveModule.mutateAsync({ ...selectedModule, ...patch })}
      />
    );
  }

  return (
    <WorkspacePage
      {...(embedded ? { className: "!mx-0 !w-full !max-w-none !py-0" } : {})}
      title={
        level === "project"
          ? "Architect"
          : level === "platform"
          ? "Platforms"
          : level === "group"
            ? "Module Groups"
            : isAppsRoot
              ? "Apps"
              : level === "module"
                ? "Modules"
                : isAppModuleGroups
                  ? "Module Groups"
                  : "Modules"
      }
      description={
        level === "project"
          ? `Define module groups and registry modules for ${project?.title}.`
          : level === "platform"
          ? "Platform registry list for super-admins, admin, and tenant."
          : level === "group"
            ? `Module groups in ${selectedPlatform?.name}.`
            : isAppsRoot
              ? `Apps in ${selectedPlatform?.name}.`
              : level === "module"
                ? `Modules in ${selectedGroup?.name}.`
                : isAppModuleGroups
                  ? `Module groups in ${selectedModule?.name}.`
                  : `Modules in ${selectedModule?.name}.`
      }
      technicalName={project ? "page.project-architect" : "page.platform-registry"}
      actions={
        <div className="flex flex-wrap justify-end gap-2">
          {level !== "platform" && level !== "project" && !(project && level === "group") ? (
            <Button disabled={busy} variant="outline" onClick={goBack}>
              <ArrowLeftIcon className="size-4" />
              Back
            </Button>
          ) : null}
          <Button disabled={busy} variant="outline" onClick={() => void registry.refetch()}>
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (level === "project") return void initializeProjectArchitect();
              if (level === "platform") return editPlatform();
              if (level === "group") return editGroup();
              editModule();
            }}
          >
            <PlusIcon className="size-4" />
            {level === "project"
              ? "Set up Architect"
              : level === "platform"
              ? "Platform"
              : level === "group"
                ? "Module Group"
                : isAppsRoot
                  ? "App"
                  : level === "module"
                    ? "Module"
                    : isAppModuleGroups
                      ? "Module Group"
                      : "Module"}
          </Button>
        </div>
      }
    >
      {form ? (
        <RegistryEditor
          busy={busy}
          error={error}
          form={form}
          mode={editMode}
          groups={groupOptions}
          modules={moduleOptions}
          onCancel={() => setForm(null)}
          onChange={setForm}
          onSave={save}
          platforms={platforms}
        />
      ) : null}
      {level === "project" ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
          <div className="max-w-md">
            <h3 className="font-semibold">Set up the project architecture</h3>
            <p className="pt-2 text-sm leading-6 text-muted-foreground">
              Create the project registry root, then add module groups and registry modules.
            </p>
            <Button className="mt-4" disabled={busy} onClick={() => void initializeProjectArchitect()}>
              <PlusIcon className="size-4" /> Set up Architect
            </Button>
          </div>
        </div>
      ) : null}
      {level === "platform" ? (
        <PlatformList
          items={platforms}
          onEdit={editPlatform}
          onSelect={openPlatform}
          onToggle={(item) =>
            mutations.setActive.mutate({ active: !item.active, id: item.id, kind: "platforms" })
          }
        />
      ) : null}
      {level === "group" ? (
        <ModuleGroupList
          items={groups}
          onEdit={editGroup}
          onSelect={(item) => {
            setGroupId(item.id);
            setModuleId("");
            setForm(null);
          }}
          onToggle={(item) =>
            mutations.setActive.mutate({ active: !item.active, id: item.id, kind: "groups" })
          }
        />
      ) : null}
      {level === "module" && isAppsRoot ? (
        <AppList
          items={modules}
          onEdit={editModule}
          onSelect={(item) => {
            setModuleId(item.id);
            setForm(null);
          }}
          onToggle={(item) =>
            mutations.setActive.mutate({ active: !item.active, id: item.id, kind: "modules" })
          }
        />
      ) : null}
      {level === "module" && !isAppsRoot ? (
        <ModuleList
          items={modules}
          onEdit={editModule}
          onSelect={(item) => {
            setModuleId(item.id);
            setForm(null);
          }}
          onToggle={(item) =>
            mutations.setActive.mutate({ active: !item.active, id: item.id, kind: "modules" })
          }
        />
      ) : null}
      {level === "submodule" && isAppModuleGroups ? (
        <ModuleGroupModuleList
          items={childModules}
          onEdit={editModule}
          onSelect={(item) => {
            setModuleId(item.id);
            setForm(null);
          }}
          onToggle={(item) =>
            mutations.setActive.mutate({ active: !item.active, id: item.id, kind: "modules" })
          }
        />
      ) : null}
      {level === "submodule" && !isAppModuleGroups ? (
        <ModuleList
          items={childModules}
          onEdit={editModule}
          onSelect={(item) => {
            setModuleId(item.id);
            setForm(null);
          }}
          onToggle={(item) =>
            mutations.setActive.mutate({ active: !item.active, id: item.id, kind: "modules" })
          }
        />
      ) : null}
    </WorkspacePage>
  );
}

function RegistryEditor({
  busy,
  error,
  form,
  groups,
  mode,
  modules,
  onCancel,
  onChange,
  onSave,
  platforms
}: {
  busy: boolean;
  error: string;
  form: EditForm;
  groups: ProjectManagerRegistryGroupNode[];
  mode: EditMode;
  modules: ProjectManagerRegistryModuleNode[];
  onCancel: () => void;
  onChange: (form: EditForm) => void;
  onSave: () => void;
  platforms: ProjectManagerRegistryPlatformNode[];
}) {
  return (
    <div className="mb-4 rounded-md border bg-card p-4 shadow-sm">
      {error ? <WorkspaceFormBanner title="Could not save">{error}</WorkspaceFormBanner> : null}
      <WorkspaceFormGrid columns={3}>
        <WorkspaceFormField label="Key" required>
          <Input
            className="font-mono"
            value={form.key}
            onChange={(event) => onChange({ ...form, key: event.target.value })}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Name" required>
          <Input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Status">
          <Input
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Sort">
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(event) => onChange({ ...form, sortOrder: event.target.value })}
          />
        </WorkspaceFormField>
        {mode === "group" ? (
          <WorkspaceFormField label="Platform">
            <WorkspaceSelect
              value={form.platformId ?? ""}
              options={platforms.map((platform) => ({ label: platform.name, value: platform.id }))}
              onValueChange={(platformId) => onChange({ ...form, platformId })}
            />
          </WorkspaceFormField>
        ) : null}
        {mode === "group" ? (
          <WorkspaceFormField label="Parent group">
            <WorkspaceSelect
              value={form.parentGroupId ?? ""}
              options={[
                { label: "None", value: "" },
                ...groups.map((group) => ({ label: group.name, value: group.id }))
              ]}
              onValueChange={(parentGroupId) => onChange({ ...form, parentGroupId })}
            />
          </WorkspaceFormField>
        ) : null}
        {mode === "module" ? (
          <WorkspaceFormField label="Group">
            <WorkspaceSelect
              value={form.groupId ?? ""}
              options={groups.map((group) => ({ label: group.name, value: group.id }))}
              onValueChange={(groupId) => onChange({ ...form, groupId })}
            />
          </WorkspaceFormField>
        ) : null}
        {mode === "module" ? (
          <WorkspaceFormField label="Parent module">
            <WorkspaceSelect
              value={form.parentModuleId ?? ""}
              options={[
                { label: "None", value: "" },
                ...modules.map((module) => ({ label: module.name, value: module.id }))
              ]}
              onValueChange={(parentModuleId) => onChange({ ...form, parentModuleId })}
            />
          </WorkspaceFormField>
        ) : null}
        {mode === "module" ? (
          <WorkspaceFormField label="Type">
            <WorkspaceSelect
              value={form.moduleType ?? "module"}
              options={[
                { label: "Area", value: "area" },
                { label: "Module", value: "module" },
                { label: "Page", value: "page" }
              ]}
              onValueChange={(moduleType) =>
                onChange({ ...form, moduleType: moduleType as "area" | "module" | "page" })
              }
            />
          </WorkspaceFormField>
        ) : null}
        {mode === "module" ? (
          <WorkspaceFormField label="Route">
            <Input
              className="font-mono"
              value={form.routePath ?? ""}
              onChange={(event) => onChange({ ...form, routePath: event.target.value })}
            />
          </WorkspaceFormField>
        ) : null}
        <WorkspaceFormField label="Description">
          <Input
            value={form.description}
            onChange={(event) => onChange({ ...form, description: event.target.value })}
          />
        </WorkspaceFormField>
      </WorkspaceFormGrid>
      <div className="mt-4 flex justify-end gap-2">
        <Button disabled={busy} variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={busy} onClick={onSave}>
          <SaveIcon className="size-4" />
          Save
        </Button>
      </div>
    </div>
  );
}

function flattenGroups(
  groups: ProjectManagerRegistryGroupNode[]
): ProjectManagerRegistryGroupNode[] {
  return groups.flatMap((group) => [group, ...flattenGroups(group.subGroups)]);
}

function flattenModules(
  modules: ProjectManagerRegistryModuleNode[]
): ProjectManagerRegistryModuleNode[] {
  return modules.flatMap((module) => [module, ...flattenModules(module.children)]);
}

function formFromPlatform(platform: ProjectManagerRegistryPlatformNode): EditForm {
  return { ...platform, sortOrder: String(platform.sortOrder) };
}

function formFromGroup(group: ProjectManagerRegistryGroupNode): EditForm {
  return { ...group, sortOrder: String(group.sortOrder) };
}

function formFromModule(module: ProjectManagerRegistryModuleNode): EditForm {
  return { ...module, sortOrder: String(module.sortOrder) };
}

function payloadFromForm(form: EditForm): RegistrySavePayload {
  const payload: RegistrySavePayload = {
    description: form.description,
    key: form.key,
    name: form.name,
    sortOrder: Number(form.sortOrder || 0),
    status: form.status
  };
  if (form.active !== undefined) payload.active = form.active;
  if (form.groupId) payload.groupId = form.groupId;
  if (form.id) payload.id = form.id;
  if (form.moduleType) payload.moduleType = form.moduleType;
  if (form.parentGroupId) payload.parentGroupId = form.parentGroupId;
  if (form.parentModuleId) payload.parentModuleId = form.parentModuleId;
  if (form.platformId) payload.platformId = form.platformId;
  if (form.routePath) payload.routePath = form.routePath;
  return payload;
}

const projectArchitectPrefix = "project-architect-";

function projectArchitectKey(project: ProjectManagerRecord) {
  return `${projectArchitectPrefix}${project.id}`;
}

function isProjectArchitectPlatform(key: string) {
  return key.startsWith(projectArchitectPrefix);
}
