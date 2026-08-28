import "@excalidraw/excalidraw/index.css";
import {
  CaptureUpdateAction,
  Excalidraw,
  exportToBlob,
  exportToSvg,
  serializeAsJSON
} from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Button } from "@neot/ui/components/button";
import { GlobalLoader } from "@neot/ui/components/global-loader";
import { Input } from "@neot/ui/components/input";
import {
  CheckIcon,
  DownloadIcon,
  FrameIcon,
  ImportIcon,
  MessageSquareIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SearchIcon,
  Trash2Icon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import {
  usePlanningActions,
  usePlanningBoard,
  usePlanningBoards,
  usePlanningComments
} from "./planning.hooks";
import { normalizePlanningScene, planningSceneFromSerialized } from "./planning.scene";
import type { PlanningRecordKind, PlanningScene } from "./planning.types";

export function PlanningWorkspace() {
  const uuid = window.location.pathname.split("/").filter(Boolean)[3] ?? "";
  return uuid ? <PlanningEditor uuid={uuid} /> : <PlanningBoardList />;
}

function PlanningBoardList() {
  const search = new URLSearchParams(window.location.search);
  const recordKind = search.get("recordKind") as PlanningRecordKind | null;
  const recordUuid = search.get("recordUuid");
  const record = recordKind && recordUuid ? { kind: recordKind, uuid: recordUuid } : undefined;
  const boards = usePlanningBoards(record);
  const projects = useProjectManagerRecordsQuery("project");
  const actions = usePlanningActions();
  const [title, setTitle] = useState("");
  const [projectUuid, setProjectUuid] = useState("");
  const create = async () => {
    const board = await actions.create.mutateAsync({
      description: "",
      projectUuid: record?.kind === "project" ? record.uuid : projectUuid || null,
      ...(record ? { recordKind: record.kind, recordUuid: record.uuid } : {}),
      title: title.trim()
    });
    window.location.assign(`/app/neot/planning/${board.uuid}`);
  };
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-4 py-5">
      <header className="rounded-md border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase text-muted-foreground">Planning</p>
        <h1 className="text-2xl font-semibold">Whiteboards</h1>
        <p className="text-sm text-muted-foreground">
          Visual plans connected to NEOT work and synchronized with cloud.
        </p>
        {record ? (
          <p className="mt-2 text-xs font-medium text-primary">
            Linked to this {record.kind} · {boards.data?.length ?? 0} boards
          </p>
        ) : null}
      </header>
      <section className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1fr_18rem_auto]">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Board title"
        />
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={record?.kind === "project" ? record.uuid : projectUuid}
          disabled={Boolean(record)}
          onChange={(event) => setProjectUuid(event.target.value)}
        >
          <option value="">No project</option>
          {(projects.data ?? []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <Button disabled={!title.trim() || actions.create.isPending} onClick={() => void create()}>
          <PlusIcon /> Create board
        </Button>
      </section>
      {boards.isLoading ? (
        <GlobalLoader />
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(boards.data ?? []).map((board, index) => (
            <button
              key={board.uuid}
              className="rounded-md border bg-card p-4 text-left shadow-sm hover:border-primary"
              onClick={() => window.location.assign(`/app/neot/planning/${board.uuid}`)}
            >
              <h2 className="font-semibold">{board.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {board.description || "Visual planning board"}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                {index === 0 ? "Most recent · " : ""}Last edited{" "}
                {new Date(board.updatedAt).toLocaleString()} by {board.updatedBy}
              </p>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}

function PlanningEditor({ uuid }: { uuid: string }) {
  const board = usePlanningBoard(uuid);
  const actions = usePlanningActions();
  const comments = usePlanningComments(uuid);
  const api = useRef<ExcalidrawImperativeAPI | null>(null);
  const importInput = useRef<HTMLInputElement | null>(null);
  const pending = useRef<PlanningScene | null>(null);
  const pendingFingerprint = useRef<string | null>(null);
  const persistedFingerprint = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"failed" | "saved" | "saving" | "unsaved">("saved");
  const [commentBody, setCommentBody] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(true);
  const save = async (notify = false) => {
    const scene = pending.current;
    const fingerprint = pendingFingerprint.current;
    if (!scene) return true;
    setSaveState("saving");
    try {
      await actions.update.mutateAsync({ uuid, input: { scene } });
      persistedFingerprint.current = fingerprint;
      if (pending.current === scene) {
        pending.current = null;
        pendingFingerprint.current = null;
        setSaveState("saved");
      } else setSaveState("unsaved");
      if (notify)
        toast.success("Planning board saved", {
          description: board.data?.title
        });
      return true;
    } catch (error) {
      setSaveState("failed");
      toast.error("Planning board could not be saved", {
        description: error instanceof Error ? error.message : "Unknown save error."
      });
      return false;
    }
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  if (board.isLoading || !board.data) return <GlobalLoader />;
  const initialScene = normalizePlanningScene(board.data.scene);
  if (persistedFingerprint.current === null)
    persistedFingerprint.current = JSON.stringify(initialScene);
  const leave = async () => {
    if (timer.current) clearTimeout(timer.current);
    if (await save()) window.location.assign("/app/neot/planning");
  };
  const remove = async () => {
    await actions.delete.mutateAsync(uuid);
    window.location.assign("/app/neot/planning");
  };
  const currentScene = (): PlanningScene =>
    normalizePlanningScene({
      appState: api.current?.getAppState(),
      elements: api.current?.getSceneElements() ?? [],
      files: api.current?.getFiles()
    });
  const download = (content: Blob, extension: string) => {
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(content);
    anchor.download = `${safeFileName(board.data.title)}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  const exportScene = async (format: "excalidraw" | "png" | "svg") => {
    const current = currentScene();
    if (format === "excalidraw") {
      download(
        new Blob(
          [
            JSON.stringify({
              type: "excalidraw",
              version: 2,
              source: window.location.origin,
              ...current
            })
          ],
          { type: "application/json" }
        ),
        "excalidraw"
      );
      return;
    }
    const options = {
      appState: current.appState as Partial<AppState>,
      elements: current.elements as readonly ExcalidrawElement[],
      files: current.files as BinaryFiles
    };
    if (format === "png")
      download(await exportToBlob({ ...options, mimeType: "image/png" }), "png");
    else
      download(
        new Blob([new XMLSerializer().serializeToString(await exportToSvg(options))], {
          type: "image/svg+xml"
        }),
        "svg"
      );
  };
  const importScene = async (file: File) => {
    try {
      const imported = planningSceneFromSerialized(await file.text());
      api.current?.updateScene({
        appState: imported.appState as unknown as AppState,
        captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        elements: imported.elements as readonly ExcalidrawElement[]
      });
      api.current?.addFiles(Object.values((imported.files ?? {}) as BinaryFiles));
      toast.success("Excalidraw scene imported");
    } catch (error) {
      toast.error("Could not import this Excalidraw file", {
        description: error instanceof Error ? error.message : "Invalid scene."
      });
    }
  };
  const refreshRemote = async () => {
    if (pending.current) {
      toast.warning("Save or discard local changes before refreshing.");
      return;
    }
    const result = await board.refetch();
    if (!result.data || !api.current) return;
    const remoteScene = normalizePlanningScene(result.data.scene);
    api.current.updateScene({
      appState: remoteScene.appState as unknown as AppState,
      captureUpdate: CaptureUpdateAction.NEVER,
      elements: remoteScene.elements as readonly ExcalidrawElement[]
    });
    api.current.addFiles(Object.values((remoteScene.files ?? {}) as BinaryFiles));
    api.current.history.clear();
    persistedFingerprint.current = JSON.stringify(remoteScene);
    toast.success("Latest synchronized scene loaded");
  };
  const addComment = async () => {
    const elementId = Object.entries(api.current?.getAppState().selectedElementIds ?? {}).find(
      ([, selected]) => selected
    )?.[0];
    await comments.create.mutateAsync({
      body: commentBody.trim(),
      ...(elementId ? { elementId } : {})
    });
    setCommentBody("");
  };
  return (
    <main className="flex h-[calc(100dvh-3.5rem)] min-h-0 w-full flex-col overflow-hidden p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3">
        <div>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => void leave()}
          >
            ← Whiteboards
          </button>
          <h1 className="text-lg font-semibold">{board.data.title}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-muted-foreground">
            {saveState === "saving"
              ? "Saving..."
              : saveState === "unsaved"
                ? "Unsaved changes"
                : saveState === "failed"
                  ? "Save failed"
                  : "Saved"}
          </span>
          <Button
            variant="outline"
            onClick={() => void save(true)}
            disabled={actions.update.isPending}
          >
            <SaveIcon /> Save
          </Button>
          <Button variant="outline" onClick={() => void refreshRemote()}>
            <RefreshCwIcon /> Refresh
          </Button>
          <Button variant="outline" onClick={() => importInput.current?.click()}>
            <ImportIcon /> Import
          </Button>
          <input
            ref={importInput}
            className="hidden"
            accept=".excalidraw,application/json"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importScene(file);
              event.target.value = "";
            }}
          />
          {(["excalidraw", "png", "svg"] as const).map((format) => (
            <Button key={format} variant="outline" onClick={() => void exportScene(format)}>
              <DownloadIcon /> {format.toUpperCase()}
            </Button>
          ))}
          <Button
            variant="outline"
            title="Scene search is also available with Ctrl+F."
            onClick={() =>
              document.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "f" }))
            }
          >
            <SearchIcon /> Search
          </Button>
          <Button variant="outline" onClick={() => api.current?.setActiveTool({ type: "frame" })}>
            <FrameIcon /> Frame
          </Button>
          <Button
            variant={commentsOpen ? "default" : "outline"}
            onClick={() => setCommentsOpen((value) => !value)}
          >
            <MessageSquareIcon /> Comments
          </Button>
          <Button variant="outline" onClick={() => void remove()}>
            <Trash2Icon /> Delete
          </Button>
        </div>
      </header>
      <section
        className={`grid min-h-0 flex-1 overflow-hidden rounded-md border bg-white ${
          commentsOpen ? "lg:grid-cols-[minmax(0,1fr)_22rem]" : ""
        }`}
      >
        <div className="h-full min-h-0 w-full">
          <Excalidraw
            excalidrawAPI={(value) => {
              api.current = value;
            }}
            initialData={{
              elements: initialScene.elements as readonly ExcalidrawElement[],
              appState: initialScene.appState as Partial<AppState>,
              files: initialScene.files as BinaryFiles
            }}
            onChange={(elements, appState, files) => {
              const nextScene = planningSceneFromSerialized(
                serializeAsJSON(elements, appState, files, "database")
              );
              const nextFingerprint = JSON.stringify(nextScene);
              if (nextFingerprint === persistedFingerprint.current) return;
              pending.current = nextScene;
              pendingFingerprint.current = nextFingerprint;
              setSaveState("unsaved");
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => void save(), 1200);
            }}
          />
        </div>
        {commentsOpen ? (
          <aside className="overflow-y-auto border-l bg-card p-3">
            <h2 className="font-semibold">Board comments</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Select an element before commenting to anchor it. Use @name or @email to mention
              someone.
            </p>
            <div className="flex gap-2">
              <Input
                value={commentBody}
                placeholder="Add a comment…"
                onChange={(event) => setCommentBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && commentBody.trim()) void addComment();
                }}
              />
              <Button
                size="icon"
                disabled={!commentBody.trim() || comments.create.isPending}
                onClick={() => void addComment()}
              >
                <PlusIcon />
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {(comments.query.data ?? []).map((comment) => (
                <article
                  key={comment.uuid}
                  className={`rounded-md border p-3 ${
                    comment.status === "resolved" ? "opacity-60" : ""
                  }`}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => {
                      if (!comment.elementId) return;
                      const element = api.current
                        ?.getSceneElements()
                        .find((entry) => entry.id === comment.elementId);
                      if (element) api.current?.scrollToContent(element, { animate: true });
                    }}
                  >
                    <p className="text-sm">{comment.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {comment.createdBy} · {new Date(comment.createdAt).toLocaleString()}
                      {comment.elementId ? " · Anchored" : ""}
                    </p>
                  </button>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["👍", "❤️", "👀"].map((reaction) => (
                      <Button
                        key={reaction}
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          comments.react.mutate({
                            commentUuid: comment.uuid,
                            reaction
                          })
                        }
                      >
                        {reaction}{" "}
                        {comment.reactions.filter((entry) => entry.reaction === reaction).length}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        comments.resolve.mutate({
                          commentUuid: comment.uuid,
                          resolved: comment.status !== "resolved"
                        })
                      }
                    >
                      <CheckIcon />
                      {comment.status === "resolved" ? "Reopen" : "Resolve"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        ) : null}
      </section>
    </main>
  );
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[^\w.-]+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "neot-board"
  );
}
