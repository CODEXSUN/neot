import { ArchiveRestoreIcon, BanIcon } from "lucide-react";
import { Button } from "@neot/ui/components/button";
import { WorkspaceStatusBadge } from "@neot/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@neot/ui/workspace/table";
import type {
  ProjectManagerRegistryGroupNode,
  ProjectManagerRegistryModuleNode,
  ProjectManagerRegistryPlatformNode
} from "../project-manager/project-manager.types";

type RegistryItem = {
  active: boolean;
  description: string;
  id: string;
  key: string;
  name: string;
  status: string;
};

type RegistryListProps<T extends RegistryItem> = {
  emptyLabel: string;
  itemLabel: string;
  items: T[];
  onEdit: (item: T) => void;
  onSelect: (item: T) => void;
  onToggle: (item: T) => void;
};

export function PlatformList(
  props: Omit<RegistryListProps<ProjectManagerRegistryPlatformNode>, "emptyLabel" | "itemLabel">
) {
  return <RegistryTable {...props} emptyLabel="No platforms found." itemLabel="Platform" />;
}

export function ModuleGroupList(
  props: Omit<RegistryListProps<ProjectManagerRegistryGroupNode>, "emptyLabel" | "itemLabel">
) {
  return <RegistryTable {...props} emptyLabel="No module groups found." itemLabel="Module Group" />;
}

export function ModuleList(
  props: Omit<RegistryListProps<ProjectManagerRegistryModuleNode>, "emptyLabel" | "itemLabel">
) {
  return <RegistryTable {...props} emptyLabel="No modules found." itemLabel="Module" />;
}

export function ModuleGroupModuleList(
  props: Omit<RegistryListProps<ProjectManagerRegistryModuleNode>, "emptyLabel" | "itemLabel">
) {
  return <RegistryTable {...props} emptyLabel="No module groups found." itemLabel="Module Group" />;
}

export function AppList(
  props: Omit<RegistryListProps<ProjectManagerRegistryModuleNode>, "emptyLabel" | "itemLabel">
) {
  return <RegistryTable {...props} emptyLabel="No apps found." itemLabel="App" />;
}

export function SubmoduleList(
  props: Omit<RegistryListProps<ProjectManagerRegistryModuleNode>, "emptyLabel" | "itemLabel">
) {
  return <RegistryTable {...props} emptyLabel="No submodules found." itemLabel="Submodule" />;
}

function RegistryTable<T extends RegistryItem>({
  emptyLabel,
  itemLabel,
  items,
  onEdit,
  onSelect,
  onToggle
}: RegistryListProps<T>) {
  return (
    <WorkspaceTablePanel>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <WorkspaceTableHeaderCell>#</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>{itemLabel}</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>Key</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>Action</WorkspaceTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr className="border-b border-border/70 last:border-b-0" key={item.id}>
              <td className="w-14 px-4 py-2.5 text-muted-foreground">{index + 1}</td>
              <td className="px-4 py-2.5">
                <button
                  className="font-medium hover:underline"
                  onClick={() => onSelect(item)}
                  type="button"
                >
                  {item.name}
                </button>
                {item.description ? (
                  <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                ) : null}
              </td>
              <td className="px-4 py-2.5 font-mono text-xs">{item.key}</td>
              <td className="px-4 py-2.5">
                <WorkspaceStatusBadge
                  label={item.active ? item.status : "off"}
                  tone={item.active ? "success" : "danger"}
                />
              </td>
              <td className="px-4 py-2.5">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(item)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onToggle(item)}>
                    {item.active ? (
                      <BanIcon className="size-4" />
                    ) : (
                      <ArchiveRestoreIcon className="size-4" />
                    )}
                    {item.active ? "Off" : "Restore"}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? (
        <WorkspaceTableEmptyState>{emptyLabel}</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
