import { Button } from "@neot/ui/components/button";
import { ArrowUpIcon, MicIcon, PaperclipIcon, XIcon } from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { toast } from "sonner";
import type { AgentIdeAccess, AgentIdeAttachment, AgentIdeModel } from "./agent-ide.types";

type Props = {
  access: AgentIdeAccess;
  activity: string;
  disabled: boolean;
  message: string;
  model: AgentIdeModel;
  onAccessChange: (access: AgentIdeAccess) => void;
  onMessageChange: (message: string) => void;
  onModelChange: (model: AgentIdeModel) => void;
  onSend: (message: string, attachments: AgentIdeAttachment[]) => void;
  running: boolean;
};

const maximumFileSize = 2 * 1024 * 1024;
const maximumAttachments = 5;
const supportedExtensions = [
  ".css", ".csv", ".html", ".js", ".json", ".jsx", ".log", ".md", ".ts", ".tsx",
  ".txt", ".xml", ".yaml", ".yml"
];

export function AgentIdeComposer(props: Props) {
  const [attachments, setAttachments] = useState<AgentIdeAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [listening, setListening] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

  const send = () => {
    const value = props.message.trim() || (attachments.length ? "Review the attached context." : "");
    if (!value || props.disabled || props.running) return;
    props.onSend(value, attachments);
    props.onMessageChange("");
    setAttachments([]);
  };

  const ingestFiles = async (incoming: File[]) => {
    const files = incoming.slice(0, maximumAttachments - attachments.length);
    const accepted = (await Promise.all(files.map(toAttachment))).filter(
      (attachment): attachment is AgentIdeAttachment => Boolean(attachment)
    );
    setAttachments((current) => [...current, ...accepted].slice(0, maximumAttachments));
  };

  const addFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    await ingestFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDragging(false);
    void ingestFiles(Array.from(event.dataTransfer.files));
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;
    event.preventDefault();
    void ingestFiles(files);
  };

  const changeAccess = (event: ChangeEvent<HTMLSelectElement>) => {
    const access = event.target.value as AgentIdeAccess;
    if (
      access === "full-access" &&
      !window.confirm("Full access removes Codex sandbox restrictions. Enable it for this new chat?")
    ) {
      event.target.value = props.access;
      return;
    }
    props.onAccessChange(access);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const toggleVoice = () => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      toast.error("Voice dictation is not supported by this browser.");
      return;
    }
    const instance = new Recognition();
    instance.continuous = false;
    instance.interimResults = false;
    instance.lang = navigator.language || "en-US";
    instance.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      props.onMessageChange(`${props.message}${props.message ? " " : ""}${transcript}`);
    };
    instance.onerror = () => toast.error("Voice dictation could not capture audio.");
    instance.onend = () => setListening(false);
    recognition.current = instance;
    setListening(true);
    instance.start();
  };

  return (
    <form
      className="bg-background px-5 pb-4 pt-3 sm:px-8"
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      onSubmit={(event: FormEvent) => { event.preventDefault(); send(); }}
    >
      <div className={`relative mx-auto max-w-5xl rounded-2xl border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/30 ${dragging ? "border-primary ring-2 ring-primary/20" : ""}`}>
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-background/90 text-sm font-medium">
            Drop files or images here
          </div>
        ) : null}
        {attachments.length ? (
          <div className="flex flex-wrap gap-2 px-2 pt-1">
            {attachments.map((file) => (
              <span className="flex items-center gap-2 rounded-lg border bg-muted/40 px-2.5 py-2 text-xs" key={`${file.name}-${file.size}`}>
                {file.kind === "image" ? (
                  <img alt="" className="size-8 rounded object-cover" src={file.content} />
                ) : <PaperclipIcon className="size-3.5" />}
                <span className="max-w-44 truncate">{file.name}</span>
                <button aria-label={`Remove ${file.name}`} onClick={() => setAttachments((current) => current.filter((item) => item !== file))} type="button">
                  <XIcon className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        ) : null}
        <textarea
          aria-label="Message Codex"
          className="max-h-48 min-h-20 w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 outline-none"
          disabled={props.disabled || props.running}
          onChange={(event) => props.onMessageChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={props.disabled ? "Select a project and connect Codex first" : "Ask Codex about this project…"}
          value={props.message}
        />
        <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
          <input accept={`${supportedExtensions.join(",")},image/png,image/jpeg,image/webp,image/gif`} className="hidden" multiple onChange={(event) => void addFiles(event)} ref={fileInput} type="file" />
          <Button aria-label="Attach files or images" disabled={attachments.length >= maximumAttachments || props.running} onClick={() => fileInput.current?.click()} size="icon" type="button" variant="ghost">
            <PaperclipIcon />
          </Button>
          <select aria-label="Access mode" className="h-8 rounded-md bg-transparent px-2 text-xs font-medium outline-none hover:bg-muted" disabled={props.running} onChange={changeAccess} value={props.access}>
            <option value="plan">Plan</option>
            <option value="read-only">Read only</option>
            <option value="ask-approval">Ask for approval</option>
            <option value="auto-approve">Approve for me</option>
            <option value="full-access">Full access</option>
          </select>
          <div className="flex-1" />
          <select aria-label="Model" className="h-8 rounded-md bg-transparent px-2 text-xs font-medium outline-none hover:bg-muted" disabled={props.running} onChange={(event) => props.onModelChange(event.target.value as AgentIdeModel)} value={props.model}>
            <option value="gpt-5.6-sol">5.6 Sol</option>
            <option value="gpt-5.6-terra">5.6 Terra</option>
            <option value="gpt-5.6-luna">5.6 Luna</option>
          </select>
          <Button aria-label={listening ? "Stop voice dictation" : "Start voice dictation"} className={listening ? "text-destructive" : ""} onClick={toggleVoice} size="icon" type="button" variant="ghost"><MicIcon /></Button>
          <Button aria-label="Send message" className="rounded-full" disabled={props.disabled || props.running || (!props.message.trim() && !attachments.length)} size="icon" type="submit"><ArrowUpIcon /></Button>
        </div>
      </div>
      <p className="mx-auto max-w-5xl px-1 pt-2 text-xs text-muted-foreground">
        {props.running ? props.activity || "Codex is working…" : "Paste, drag, or attach files · Enter to send · Shift+Enter for a new line"}
      </p>
    </form>
  );
}

async function toAttachment(file: File): Promise<AgentIdeAttachment | null> {
  const image = file.type.startsWith("image/");
  if (file.size > maximumFileSize || (!image && !isSupportedText(file))) {
    toast.error(`${file.name} must be an image or supported text/code file under 2 MB.`);
    return null;
  }
  return {
    content: image ? await readDataUrl(file) : await file.text(),
    kind: image ? "image" : "text",
    mimeType: file.type || "text/plain",
    name: file.name || `pasted-image-${Date.now()}.png`,
    size: file.size
  };
}

function isSupportedText(file: File) {
  const lowerName = file.name.toLowerCase();
  return file.type.startsWith("text/") || supportedExtensions.some((extension) => lowerName.endsWith(extension));
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: () => void;
  onerror: () => void;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition() {
  const speechWindow = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}
