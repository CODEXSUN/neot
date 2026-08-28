import { useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  FileIcon,
  FileImageIcon,
  FileTextIcon,
  LoaderCircleIcon,
  Trash2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@neot/ui/components/button";
import {
  deleteProjectManagerAttachment,
  downloadProjectManagerAttachment,
  listProjectManagerAttachments,
} from "./project-manager.services";
import type {
  ProjectManagerAttachment,
  ProjectManagerAttachmentKind,
} from "./project-manager.types";

const maximumFileBytes = 2 * 1024 * 1024;
const maximumAttachments = 20;
const acceptedMimeTypes = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

export function ProjectManagerAttachments({
  kind,
  pendingFiles,
  recordId,
  onPendingFilesChange,
}: {
  kind: ProjectManagerAttachmentKind;
  pendingFiles: File[];
  recordId?: string;
  onPendingFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ProjectManagerAttachment[]>(
    [],
  );
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(recordId));
  const [removingId, setRemovingId] = useState("");

  useEffect(() => {
    let active = true;
    if (!recordId) {
      setAttachments([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    void listProjectManagerAttachments(kind, recordId)
      .then((records) => {
        if (active) setAttachments(records);
      })
      .catch((loadError) => {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Attachments could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [kind, recordId]);

  function addFiles(files: File[]) {
    setError("");
    const available = Math.max(
      0,
      maximumAttachments - attachments.length - pendingFiles.length,
    );
    if (!available) {
      setError(`A record can contain up to ${maximumAttachments} attachments.`);
      return;
    }
    const accepted: File[] = [];
    for (const file of files) {
      const mimeType =
        file.type ||
        (file.name.toLowerCase().endsWith(".txt") ? "text/plain" : "");
      if (!acceptedMimeTypes.has(mimeType)) {
        setError(
          "Only PNG, JPEG, WebP, GIF, PDF, and TXT files are supported.",
        );
        continue;
      }
      if (file.size > maximumFileBytes) {
        setError(`${file.name} is larger than 2 MB.`);
        continue;
      }
      const duplicate = [...pendingFiles, ...accepted].some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified,
      );
      if (!duplicate && accepted.length < available) accepted.push(file);
    }
    if (accepted.length) onPendingFilesChange([...pendingFiles, ...accepted]);
  }

  async function removeAttachment(attachment: ProjectManagerAttachment) {
    if (!recordId || !window.confirm(`Remove ${attachment.originalName}?`))
      return;
    setRemovingId(attachment.id);
    setError("");
    try {
      await deleteProjectManagerAttachment(kind, recordId, attachment.id);
      setAttachments((current) =>
        current.filter((item) => item.id !== attachment.id),
      );
      toast.success("Attachment removed", {
        description: attachment.originalName,
      });
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Attachment could not be removed.",
      );
    } finally {
      setRemovingId("");
    }
  }

  return (
    <section className="mt-6 rounded-md border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Attachments</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Add multiple images, PDFs, or TXT files. Maximum 2 MB per file.
        </p>
      </div>
      <div
        className={`rounded-md border border-dashed p-5 text-center transition-colors ${
          dragging ? "border-primary bg-primary/5" : "bg-muted/15"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles([...event.dataTransfer.files]);
        }}
      >
        <UploadCloudIcon className="mx-auto size-7 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Drop files here</p>
        <p className="mt-1 text-xs text-muted-foreground">
          or choose files from your computer
        </p>
        <Button
          className="mt-3"
          size="sm"
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
        <input
          ref={inputRef}
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,.txt"
          className="hidden"
          type="file"
          onChange={(event) => {
            addFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircleIcon className="size-4 animate-spin" />
          Loading attachments
        </div>
      ) : null}
      {attachments.length || pendingFiles.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <AttachmentRow
              attachment={attachment}
              busy={removingId === attachment.id}
              key={attachment.id}
              onDownload={() => {
                if (!recordId) return;
                void downloadProjectManagerAttachment(
                  kind,
                  recordId,
                  attachment,
                ).catch((downloadError) =>
                  setError(
                    downloadError instanceof Error
                      ? downloadError.message
                      : "Attachment could not be downloaded.",
                  ),
                );
              }}
              onRemove={() => void removeAttachment(attachment)}
            />
          ))}
          {pendingFiles.map((file, index) => (
            <PendingAttachmentRow
              file={file}
              key={`${file.name}-${file.size}-${file.lastModified}`}
              onRemove={() =>
                onPendingFilesChange(
                  pendingFiles.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AttachmentRow({
  attachment,
  busy,
  onDownload,
  onRemove,
}: {
  attachment: ProjectManagerAttachment;
  busy: boolean;
  onDownload: () => void;
  onRemove: () => void;
}) {
  const Icon = fileIcon(attachment.mimeType);
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border bg-background p-3">
      <Icon className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">
          {attachment.originalName}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatBytes(attachment.sizeBytes)}
        </div>
      </div>
      <Button
        aria-label={`Download ${attachment.originalName}`}
        size="icon"
        type="button"
        variant="ghost"
        onClick={onDownload}
      >
        <DownloadIcon className="size-4" />
      </Button>
      <Button
        aria-label={`Remove ${attachment.originalName}`}
        disabled={busy}
        size="icon"
        type="button"
        variant="ghost"
        onClick={onRemove}
      >
        {busy ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <Trash2Icon className="size-4" />
        )}
      </Button>
    </div>
  );
}

function PendingAttachmentRow({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const Icon = fileIcon(
    file.type || (file.name.endsWith(".txt") ? "text/plain" : ""),
  );
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border bg-primary/5 p-3">
      <Icon className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{file.name}</div>
        <div className="text-xs text-muted-foreground">
          {formatBytes(file.size)} · pending save
        </div>
      </div>
      <Button
        aria-label={`Remove pending ${file.name}`}
        size="icon"
        type="button"
        variant="ghost"
        onClick={onRemove}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  );
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImageIcon;
  if (mimeType === "text/plain") return FileTextIcon;
  return FileIcon;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value / 1024)} KB`;
}
