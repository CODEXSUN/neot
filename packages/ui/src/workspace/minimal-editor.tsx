"use client";

import * as React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, Redo2, Undo2 } from "lucide-react";
import { cn } from "../lib/utils";

export function WorkspaceMinimalEditor({
  className,
  content,
  onChange,
  placeholder = "Add a description..."
}: {
  className?: string;
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder })],
    content: content ?? "",
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none min-h-[120px] px-3 py-3 focus:outline-none" }
    },
    onUpdate: ({ editor: nextEditor }) => onChange?.(nextEditor.getHTML())
  });

  React.useEffect(() => {
    if (!editor || content === undefined || content === editor.getHTML()) return;
    editor.commands.setContent(content, { emitUpdate: false });
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-border/80 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex min-h-9 items-center gap-1 border-b border-border/70 bg-muted/20 px-2 py-1">
        <EditorButton
          active={editor.isActive("bold")}
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </EditorButton>
        <EditorButton
          active={editor.isActive("italic")}
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </EditorButton>
        <EditorButton
          active={editor.isActive("bulletList")}
          label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </EditorButton>
        <span className="mx-1 h-5 w-px bg-border/70" />
        <EditorButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" />
        </EditorButton>
        <EditorButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" />
        </EditorButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function EditorButton({
  active,
  children,
  disabled,
  label,
  onClick
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "bg-muted text-foreground"
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
