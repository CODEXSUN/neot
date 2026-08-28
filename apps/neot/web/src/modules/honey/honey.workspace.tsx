import { Button } from "@neot/ui/components/button";
import { Input } from "@neot/ui/components/input";
import {
  notifyHoneyConversation,
  type HoneyConversationState
} from "@neot/ui/lib/honey-conversation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArchiveIcon,
  ArrowUpIcon,
  AudioWaveformIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
  XIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { HoneyDashboard } from "./honey-dashboard";
import { HoneyFace } from "./honey-face";
import { HoneyMessageBubble, HoneyThinking } from "./honey-message";
import {
  archiveHoneyConversation,
  getHoneyConversation,
  listHoneyConversations,
  sendHoneyMessage
} from "./honey.services";
import { useHoneyVoice } from "./use-honey-voice";

export function HoneyWorkspace() {
  const [threadId, setThreadId] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("thread")
  );
  const [startingNew, setStartingNew] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [pendingMessage, setPendingMessage] = useState("");
  const [animatedMessageId, setAnimatedMessageId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "dashboard">("chat");
  const endRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const conversations = useQuery({
    queryKey: ["honey", "conversations"],
    queryFn: listHoneyConversations
  });
  const activeId = startingNew ? null : (threadId ?? conversations.data?.[0]?.id ?? null);
  const conversation = useQuery({
    queryKey: ["honey", "conversation", activeId],
    queryFn: () => getHoneyConversation(activeId!),
    enabled: Boolean(activeId)
  });
  const send = useMutation({
    mutationFn: (body: string) => sendHoneyMessage(body, activeId),
    onSuccess: async (data) => {
      setThreadId(data.id);
      setStartingNew(false);
      setPendingMessage("");
      setAnimatedMessageId(
        [...data.messages].reverse().find((item) => item.role === "assistant")?.id ?? null
      );
      queryClient.setQueryData(["honey", "conversation", data.id], data);
      await queryClient.invalidateQueries({ queryKey: ["honey", "conversations"] });
    }
  });
  const archive = useMutation({
    mutationFn: archiveHoneyConversation,
    onSuccess: async (_, archivedId) => {
      if (activeId === archivedId) {
        setStartingNew(true);
        setThreadId(null);
      }
      await queryClient.invalidateQueries({ queryKey: ["honey", "conversations"] });
    }
  });
  function submitBody(value: string) {
    const body = value.trim();
    if (!body || send.isPending) return;
    setMessage("");
    setPendingMessage(body);
    setAnimatedMessageId(null);
    send.mutate(body);
  }
  const voice = useHoneyVoice(setMessage, submitBody);
  const reaction: HoneyConversationState = voice.listening
    ? "listening"
    : send.isPending
      ? "thinking"
      : send.isError
        ? "error"
        : animatedMessageId
          ? "success"
          : "idle";
  const scrollToLatest = () => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  useEffect(() => {
    scrollToLatest();
  }, [conversation.data?.messages, send.isPending]);
  useEffect(() => {
    notifyHoneyConversation(reaction);
  }, [reaction]);
  useEffect(
    () => () => {
      notifyHoneyConversation("inactive");
    },
    []
  );
  useEffect(() => {
    if (!animatedMessageId) return;
    const timeout = window.setTimeout(() => setAnimatedMessageId(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [animatedMessageId]);
  return (
    <main className="flex h-[calc(100svh-7rem)] min-h-[34rem] bg-background">
      {drawerOpen ? (
        <ConversationDrawer
          activeId={activeId}
          archivingId={archive.isPending ? archive.variables : null}
          conversations={conversations.data ?? []}
          onArchive={(id) => archive.mutate(id)}
          onClose={() => setDrawerOpen(false)}
          onNew={() => {
            setStartingNew(true);
            setThreadId(null);
          }}
          onSelect={(id) => {
            setStartingNew(false);
            setThreadId(id);
          }}
        />
      ) : null}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b px-5">
          {!drawerOpen ? (
            <Button
              aria-label="Show conversations"
              onClick={() => setDrawerOpen(true)}
              size="icon"
              variant="ghost"
            >
              <PanelLeftOpenIcon />
            </Button>
          ) : null}
          <HoneyFace size="header" />
          <div>
            <h1 className="font-semibold">Honey</h1>
            <p className="text-xs text-muted-foreground">
              Business support within approved knowledge
            </p>
          </div>
          <Button
            className="ml-auto"
            onClick={() => setView(view === "chat" ? "dashboard" : "chat")}
            size="sm"
            variant="ghost"
          >
            {view === "chat" ? <LayoutDashboardIcon /> : <MessageSquareIcon />}
            {view === "chat" ? "Dashboard" : "Chat"}
          </Button>
        </header>
        {view === "dashboard" ? (
          <HoneyDashboard />
        ) : (
          <>
            <motion.div
              aria-live="polite"
              className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-[max(1rem,calc((100%-48rem)/2))]"
              layoutScroll
            >
              {!conversation.data?.messages.length && !send.isPending ? <Welcome /> : null}
              <AnimatePresence initial={false}>
                {(conversation.data?.messages ?? []).map((item) => (
                  <HoneyMessageBubble
                    animateAnswer={item.id === animatedMessageId}
                    item={item}
                    key={item.id}
                    onProgress={scrollToLatest}
                    onPrompt={setMessage}
                  />
                ))}
              </AnimatePresence>
              {send.isPending && pendingMessage ? (
                <HoneyMessageBubble
                  item={{
                    body: pendingMessage,
                    createdAt: new Date().toISOString(),
                    id: "pending",
                    role: "user"
                  }}
                />
              ) : null}
              {send.isPending ? <HoneyThinking /> : null}
              <div ref={endRef} />
            </motion.div>
            <Composer
              error={voice.error || send.error}
              listening={voice.listening}
              message={message}
              onCancel={voice.cancel}
              onChange={setMessage}
              onRetry={voice.retry}
              onSilenceTimeout={voice.setSilenceTimeout}
              onSubmit={() => submitBody(message)}
              onVoice={voice.toggle}
              pending={send.isPending}
              preview={voice.preview}
              silenceTimeout={voice.silenceTimeout}
              voiceSupported={voice.supported}
            />
          </>
        )}
      </section>
    </main>
  );
}

function Composer(props: {
  error: unknown;
  listening: boolean;
  message: string;
  onCancel: () => void;
  onChange: (value: string) => void;
  onRetry: () => void;
  onSilenceTimeout: (value: number) => void;
  onSubmit: () => void;
  onVoice: () => void;
  pending: boolean;
  preview: string;
  silenceTimeout: number;
  voiceSupported: boolean;
}) {
  const {
    error,
    listening,
    message,
    onCancel,
    onChange,
    onRetry,
    onSilenceTimeout,
    onSubmit,
    onVoice,
    pending,
    preview,
    silenceTimeout,
    voiceSupported
  } = props;
  return (
    <form
      className="mx-auto w-full max-w-3xl border-t p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {listening || preview ? (
        <div
          aria-live="polite"
          className="mb-2 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm"
        >
          <AudioWaveformIcon className="size-4 text-amber-700" />
          <span className="min-w-0 flex-1 truncate">{preview || "Listening for your voice…"}</span>
          <select
            aria-label="Silence timeout"
            className="bg-transparent text-xs"
            onChange={(event) => onSilenceTimeout(Number(event.target.value))}
            value={silenceTimeout}
          >
            <option value={1200}>1.2s</option>
            <option value={1800}>1.8s</option>
            <option value={3000}>3s</option>
          </select>
          <Button
            aria-label="Cancel voice"
            onClick={onCancel}
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      ) : null}
      <div className="flex items-center gap-2 rounded-full border p-1.5 pl-4 focus-within:ring-2 focus-within:ring-amber-300/40">
        <Input
          aria-label="Message Honey"
          className="h-9 flex-1 border-0 shadow-none focus-visible:ring-0"
          disabled={pending}
          placeholder={listening ? "Listening…" : "Ask Honey anything…"}
          value={message}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          aria-label={listening ? "Stop voice typing" : "Start voice typing"}
          disabled={!voiceSupported || pending}
          onClick={onVoice}
          size="icon"
          type="button"
          variant="ghost"
        >
          <AudioWaveformIcon className={listening ? "animate-pulse" : ""} />
        </Button>
        <Button
          aria-label="Send to Honey"
          className="bg-amber-500 text-stone-950"
          disabled={!message.trim() || pending}
          size="icon"
          type="submit"
        >
          <ArrowUpIcon />
        </Button>
      </div>
      {error ? (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-red-600">
          <span className="flex-1">{error instanceof Error ? error.message : String(error)}</span>
          <Button onClick={onRetry} size="sm" type="button" variant="ghost">
            <RotateCcwIcon /> Retry
          </Button>
        </div>
      ) : null}
      {!voiceSupported ? (
        <p className="px-4 pt-2 text-xs text-muted-foreground">
          Voice fallback: type your message. Allow microphone access and use Chrome or Edge for
          voice.
        </p>
      ) : null}
    </form>
  );
}
function ConversationDrawer({
  activeId,
  archivingId,
  conversations,
  onArchive,
  onClose,
  onNew,
  onSelect
}: {
  activeId: string | null;
  archivingId: string | null | undefined;
  conversations: Array<{ id: string; title: string }>;
  onArchive: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <motion.aside
      animate={{ width: 288 }}
      className="flex shrink-0 flex-col overflow-hidden border-r bg-muted/15 p-3"
      initial={{ width: 0 }}
    >
      <div className="flex gap-2">
        <Button className="flex-1 justify-start" onClick={onNew} variant="outline">
          <PlusIcon /> New conversation
        </Button>
        <Button aria-label="Hide conversations" onClick={onClose} size="icon" variant="ghost">
          <PanelLeftCloseIcon />
        </Button>
      </div>
      <div className="mt-3 space-y-1 overflow-y-auto">
        {conversations.map((item) => (
          <div
            className={`group/history flex items-center rounded-xl ${activeId === item.id ? "bg-amber-50" : "hover:bg-muted"}`}
            key={item.id}
          >
            <button
              className={`min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm ${activeId === item.id ? "font-medium" : ""}`}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              {item.title}
            </button>
            <Button
              aria-label={`Archive ${item.title}`}
              className="mr-1 shrink-0 opacity-0 transition-opacity group-hover/history:opacity-100 focus-visible:opacity-100"
              disabled={archivingId === item.id}
              onClick={() => onArchive(item.id)}
              size="icon"
              title="Archive conversation"
              variant="ghost"
            >
              <ArchiveIcon />
            </Button>
          </div>
        ))}
      </div>
    </motion.aside>
  );
}
function Welcome() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="m-auto max-w-md text-center"
      initial={{ opacity: 0, y: 10 }}
    >
      <SparklesIcon className="mx-auto size-8 text-amber-600" />
      <h2 className="pt-3 text-xl font-semibold">Honey is here to help</h2>
      <p className="pt-2 text-sm text-muted-foreground">
        Honey uses the current page and approved business knowledge. Coding work is handed to
        Project Agent.
      </p>
    </motion.div>
  );
}
