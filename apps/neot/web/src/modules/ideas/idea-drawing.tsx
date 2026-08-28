import "@excalidraw/excalidraw/index.css";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Button } from "@neot/ui/components/button";
import { SaveIcon, XIcon } from "lucide-react";
import { useRef } from "react";
import type { IdeaScene } from "./ideas.types";

export function IdeaDrawing({ initial, onClose, onSave }: { initial: IdeaScene | null; onClose: () => void; onSave: (scene: IdeaScene) => void }) {
  const latest = useRef<IdeaScene>(initial ?? { elements: [] });
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div><strong>Idea sketch</strong><span className="pl-2 text-sm text-muted-foreground">Excalidraw canvas</span></div>
        <div className="flex gap-2"><Button variant="outline" onClick={onClose}><XIcon />Close</Button><Button onClick={() => onSave(latest.current)}><SaveIcon />Save sketch</Button></div>
      </header>
      <div className="min-h-0 flex-1">
        <Excalidraw {...(initial ? { initialData: { elements: initial.elements as readonly ExcalidrawElement[], appState: initial.appState as Partial<AppState>, files: initial.files as BinaryFiles } } : {})}
          onChange={(elements, appState, files) => { latest.current = { elements: [...elements], appState: { viewBackgroundColor: appState.viewBackgroundColor }, files }; }}
          UIOptions={{ canvasActions: { saveToActiveFile: false, loadScene: false } }}
          autoFocus />
      </div>
    </div>
  );
}
