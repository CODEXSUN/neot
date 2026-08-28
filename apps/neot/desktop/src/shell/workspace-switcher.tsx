import { Folder } from "lucide-react";
import type { DesktopWorkspace, Workspace } from "../contracts/desktop";

export function WorkspaceSwitcher({
  currentWorkspace,
  onSelectWorkspace,
  workspaces
}: {
  currentWorkspace: Workspace;
  onSelectWorkspace: (path: string) => void;
  workspaces: DesktopWorkspace[];
}) {
  const options = groupWorkspaceOptions(workspaces, currentWorkspace.path);

  return (
    <label className="workspace-switcher">
      <Folder aria-hidden="true" size={17} />
      <span className="sr-only">Select connected folder</span>
      <select
        aria-label="Select connected folder"
        onChange={(event) => onSelectWorkspace(event.target.value)}
        value={currentWorkspace.path}
      >
        {options.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.workspaces.map((workspace) => (
              <option key={workspace.path} value={workspace.path}>{workspace.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function groupWorkspaceOptions(workspaces: DesktopWorkspace[], currentPath: string) {
  const current = workspaces.some((workspace) => workspace.path === currentPath)
    ? workspaces
    : [{
        kind: "application" as const,
        lastOpenedAt: "",
        name: currentPath.split(/[\\/]/).at(-1) ?? "Current folder",
        path: currentPath,
        pinned: false,
        relationship: "standalone" as const
      }, ...workspaces];
  const groups = [
    { label: "Projects", workspaces: current.filter((workspace) => workspace.relationship === "project") },
    { label: "Add-on projects", workspaces: current.filter((workspace) => workspace.relationship === "addOn") },
    {
      label: "Plugins",
      workspaces: current.filter((workspace) => workspace.kind === "plugin" && workspace.relationship !== "addOn")
    },
    {
      label: "Folders",
      workspaces: current.filter((workspace) => workspace.relationship === "standalone" && workspace.kind !== "plugin")
    }
  ];
  return groups.filter((group) => group.workspaces.length > 0);
}
