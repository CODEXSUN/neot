import { useCallback, useEffect, useRef, useState } from "react";
import type { DesktopSetup, FileEntry, GitChange, SystemStatus, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { afterFirstPaint } from "./startup-scheduler";
import { measureDesktopOperation } from "./desktop-performance";

export type ResourceState = "idle" | "loading" | "ready" | "unavailable";
export type AgentRuntimeState = "idle" | "connecting" | "ready" | "unavailable";

export function useDesktopSession() {
  const [agentRuntimeState] = useState<AgentRuntimeState>("idle");
  const [changes, setChanges] = useState<GitChange[]>([]);
  const [desktopSetup, setDesktopSetup] = useState<DesktopSetup>();
  const [changesState, setChangesState] = useState<ResourceState>("idle");
  const [error, setError] = useState<string>();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesState, setFilesState] = useState<ResourceState>("idle");
  const [opening, setOpening] = useState(false);
  const [system, setSystem] = useState<SystemStatus>();
  const [workspace, setWorkspace] = useState<Workspace>();
  const requestGeneration = useRef(0);

  const refreshChanges = useCallback(async () => {
    setChangesState("loading");
    try {
      setChanges(await measureDesktopOperation("git", "Git status", () => desktopClient.gitStatus()));
      setChangesState("ready");
    } catch (reason) {
      setChangesState("unavailable");
      throw reason;
    }
  }, []);

  const loadFiles = useCallback(async () => {
    const generation = requestGeneration.current;
    setFilesState("loading");
    try {
      const nextFiles = await measureDesktopOperation("files", "List workspace files", () => desktopClient.listFiles());
      if (requestGeneration.current !== generation) return;
      setFiles(nextFiles);
      setFilesState("ready");
    } catch {
      if (requestGeneration.current !== generation) return;
      setFilesState("unavailable");
    }
  }, []);

  const loadSystem = useCallback(async () => {
    try {
      setSystem(await measureDesktopOperation("workspace", "Read system status", () => desktopClient.systemStatus()));
    } catch {
      setSystem(undefined);
    }
  }, []);

  const refreshDesktopSetup = useCallback(async () => {
    const next = await measureDesktopOperation("startup", "Load desktop setup", () => desktopClient.getDesktopSetup());
    setDesktopSetup(next);
    return next;
  }, []);

  const openWorkspace = useCallback(
    async (path?: string) => {
      const generation = requestGeneration.current + 1;
      requestGeneration.current = generation;
      setOpening(true);
      setError(undefined);
      try {
        const next = await measureDesktopOperation("workspace", "Open workspace", () => desktopClient.openWorkspace(path));
        if (requestGeneration.current !== generation) return;
        setWorkspace(next);
        setFiles([]);
        setFilesState("idle");
        setChanges([]);
        setChangesState("idle");
        setSystem(undefined);
        void refreshDesktopSetup();
      } catch (reason) {
        if (path) {
          localStorage.removeItem("neot-workspace");
          localStorage.removeItem("codelogix-workspace");
        }
        setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (requestGeneration.current === generation) setOpening(false);
      }
    },
    [refreshDesktopSetup]
  );

  useEffect(() => {
    let active = true;
    void refreshDesktopSetup().then((setup) => {
      const profile = setup.profile;
      if (
        !active ||
        !profile ||
        !profile.rememberIdentity ||
        profile.confirmOnStartup ||
        !profile.defaultWorkGroupPath ||
        !profile.lastWorkspacePath
      ) return;
      const lastWorkspacePath = profile.lastWorkspacePath;
      if (lastWorkspacePath) afterFirstPaint(() => void openWorkspace(lastWorkspacePath));
    }).catch(() => {
      if (active) setDesktopSetup({ workGroups: [], workspaces: [] });
    });
    return () => {
      active = false;
    };
  }, [openWorkspace, refreshDesktopSetup]);

  return {
    agentRuntimeState,
    changes,
    changesState,
    desktopSetup,
    error,
    files,
    filesState,
    loadFiles,
    loadSystem,
    openWorkspace,
    opening,
    refreshChanges,
    refreshDesktopSetup,
    system,
    workspace
  };
}
