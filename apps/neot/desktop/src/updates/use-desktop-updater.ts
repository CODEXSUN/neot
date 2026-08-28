import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useRef, useState } from "react";
import desktopPackage from "../../package.json";

export type UpdatePhase =
  "checking" | "current" | "downloading" | "idle" | "installing" | "ready" | "unavailable";

export type DesktopUpdateState = {
  checkForUpdate: () => Promise<void>;
  currentVersion: string;
  error: string | undefined;
  installAndRestart: () => Promise<void>;
  notes: string | undefined;
  phase: UpdatePhase;
  progress: number | undefined;
  version: string | undefined;
};

export function useDesktopUpdater(): DesktopUpdateState {
  const updateRef = useRef<Update | undefined>(undefined);
  const [currentVersion, setCurrentVersion] = useState(desktopPackage.version);
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [progress, setProgress] = useState<number>();
  const [version, setVersion] = useState<string>();
  const [notes, setNotes] = useState<string>();
  const [error, setError] = useState<string>();

  const checkForUpdate = useCallback(async () => {
    if (!("__TAURI_INTERNALS__" in window)) {
      setPhase("unavailable");
      return;
    }

    setError(undefined);
    setPhase("checking");
    setProgress(undefined);

    try {
      const installedVersion = await getVersion();
      setCurrentVersion(installedVersion);
      await updateRef.current?.close();
      updateRef.current = undefined;

      const update = await check({ timeout: 20_000 });
      if (!update) {
        setVersion(undefined);
        setNotes(undefined);
        setPhase("current");
        return;
      }

      updateRef.current = update;
      setVersion(update.version);
      setNotes(update.body);
      setPhase("downloading");

      let downloaded = 0;
      let total: number | undefined;
      await update.download((event) => {
        if (event.event === "Started") total = event.data.contentLength;
        if (event.event === "Progress") downloaded += event.data.chunkLength;
        if (event.event === "Finished") setProgress(100);
        if (total) setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
      });
      setPhase("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setPhase("idle");
    }
  }, []);

  const installAndRestart = useCallback(async () => {
    if (!updateRef.current || phase !== "ready") return;
    setError(undefined);
    setPhase("installing");
    try {
      await updateRef.current.install();
      await relaunch();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setPhase("ready");
    }
  }, [phase]);

  return {
    checkForUpdate,
    currentVersion,
    error,
    installAndRestart,
    notes,
    phase,
    progress,
    version
  };
}
