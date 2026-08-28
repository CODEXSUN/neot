import { ChevronDown, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ExternalEditor } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export function OpenInMenu({ path }: { path: string | undefined }) {
  const [editors, setEditors] = useState<ExternalEditor[]>([]);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void desktopClient
      .listExternalEditors()
      .then(setEditors)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className="open-in" ref={root}>
      <button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button">
        <ExternalLink size={14} /> Open in <ChevronDown size={13} />
      </button>
      {open ? (
        <div className="open-in-menu" role="menu">
          <small>{path ? "Current file" : "Workspace"}</small>
          {editors.map((editor) => (
            <button
              key={editor.id}
              onClick={() => {
                setOpen(false);
                void desktopClient.openInExternalEditor(editor.id, path);
              }}
              role="menuitem"
              type="button"
            >
              {editor.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
