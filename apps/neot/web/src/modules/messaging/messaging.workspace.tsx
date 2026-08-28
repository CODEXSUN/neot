import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, FileText, ImageIcon, MessageCircle, Mic, Paperclip, Plus, Search, Send, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@neot/ui";
import { WorkspacePage } from "@neot/ui/workspace/page";
import { conversationsKey, useConversations, useMessages, useMessagingContacts, useMessagingSocket } from "./messaging.hooks";
import { createConversation, markConversationRead, reactToMessage, sendMessage } from "./messaging.services";
import type { MessagingAttachment, MessagingContact, MessagingConversation } from "./messaging.types";
import { MessageActions } from "./message-actions";

export function MessagingWorkspace() {
  useMessagingSocket();
  const client = useQueryClient();
  const conversations = useConversations();
  const [selectedId, setSelectedId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [showContacts, setShowContacts] = useState(false);
  const contacts = useMessagingContacts(contactSearch);
  const selected = (conversations.data ?? []).find((item) => item.id === selectedId) ?? null;
  useEffect(() => { if (!selectedId && conversations.data?.[0]) setSelectedId(conversations.data[0].id); }, [conversations.data, selectedId]);
  const create = useMutation({ mutationFn: createConversation, onSuccess: (conversation) => { setSelectedId(conversation.id); setShowContacts(false); setContactSearch(""); void client.invalidateQueries({ queryKey: conversationsKey }); } });
  return (
    <WorkspacePage className="!w-full !max-w-none !space-y-0 !py-0" title="">
      <div className="grid min-h-[calc(100vh-64px)] overflow-hidden border-y bg-background md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-r">
          <div className="flex items-center justify-between gap-3 border-b p-4"><div><h1 className="text-xl font-semibold">Messenger</h1><p className="text-sm text-muted-foreground">Your NEOT conversations</p></div><Button aria-label="New conversation" size="icon" onClick={() => setShowContacts((value) => !value)}><Plus className="size-4" /></Button></div>
          {showContacts ? <div className="border-b p-3"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" autoFocus placeholder="Find a user" value={contactSearch} onChange={(event) => setContactSearch(event.target.value)}/></div><div className="max-h-56 overflow-y-auto pt-2">{(contacts.data ?? []).map((contact) => <button className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted" key={contact.uuid} onClick={() => create.mutate(contact.uuid)}><Avatar name={contact.name}/><span className="min-w-0"><span className="block truncate text-sm font-medium">{contact.name}</span><span className="block truncate text-xs text-muted-foreground">{contact.email}</span></span></button>)}</div></div> : null}
          <div className="min-h-0 flex-1 overflow-y-auto">{(conversations.data ?? []).map((conversation) => <ConversationRow active={conversation.id === selectedId} conversation={conversation} key={conversation.id} onClick={() => setSelectedId(conversation.id)}/>)}</div>
        </aside>
        {selected ? <ConversationThread conversation={selected}/> : <EmptyConversation/>}
      </div>
    </WorkspacePage>
  );
}

function ConversationThread({ conversation }: { conversation: MessagingConversation }) {
  const client = useQueryClient();
  const query = useMessages(conversation.id);
  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<MessagingContact[]>([]);
  const [attachment, setAttachment] = useState<MessagingAttachment | null>(null);
  const [recording, setRecording] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const voiceChunks = useRef<Blob[]>([]);
  const actorId = currentActorId();
  const mention = mentionQuery(content);
  const mentionContacts = useMessagingContacts(mention ?? "");
  const send = useMutation({
    mutationFn: () => sendMessage(conversation.id, content.trim() || attachment?.name || "Voice note", mentionedIds(content, mentions), attachment),
    onSuccess: () => {
      setContent("");
      setMentions([]);
      setAttachment(null);
      void client.invalidateQueries({ queryKey: ["messaging", "messages", conversation.id] });
      void client.invalidateQueries({ queryKey: conversationsKey });
    }
  });
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
    const last = query.data?.at(-1);
    if (last) void markConversationRead(conversation.id, last.sequence);
  }, [conversation.id, query.data]);
  const title = conversationTitle(conversation, actorId);
  const pickAttachment = async (file: File | undefined, kind?: MessagingAttachment["kind"]) => {
    if (!file || file.size > 10 * 1024 * 1024) return;
    setAttachment({ dataUrl: await readDataUrl(file), kind: kind ?? (file.type.startsWith("image/") ? "image" : "file"), name: file.name, size: file.size, type: file.type || "application/octet-stream" });
  };
  const toggleRecording = async () => {
    if (recording) { recorder.current?.stop(); return; }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    voiceChunks.current = [];
    mediaRecorder.ondataavailable = (event) => { if (event.data.size) voiceChunks.current.push(event.data); };
    mediaRecorder.onstop = async () => {
      const blob = new Blob(voiceChunks.current, { type: mediaRecorder.mimeType });
      stream.getTracks().forEach((track) => track.stop());
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
      await pickAttachment(file, "voice");
      setRecording(false);
    };
    recorder.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
  };
  return (
    <section className="flex min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-5 py-3">
        <Avatar name={title} />
        <div><h2 className="font-semibold">{title}</h2><p className="text-xs text-muted-foreground">{conversation.members.length} participants</p></div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-2">
          {(query.data ?? []).map((message) => {
            const outgoing = message.senderId === actorId;
            return <div className={`flex ${outgoing ? "justify-end" : "justify-start"}`} key={message.id}>
              <div className={`group relative max-w-[78%] rounded-2xl px-4 py-2 shadow-sm ${message.reactions.length ? "mb-3" : ""} ${outgoing ? "border border-border/70 bg-muted text-foreground" : "border bg-background"}`}>
                <p className="whitespace-pre-wrap text-sm"><MentionedContent content={message.content} /></p>
                {message.attachment ? <MessageAttachment attachment={message.attachment} /> : null}
                <span className="flex items-center justify-end gap-1 pt-1 text-[11px] text-muted-foreground">
                  {timeLabel(message.createdAt)}
                  {outgoing ? <DeliveryReceipt status={message.deliveryStatus} /> : null}
                </span>
                <MessageActions message={message} onReact={(emoji) => void reactToMessage(conversation.id, message.id, emoji).then(() => client.invalidateQueries({ queryKey: ["messaging", "messages", conversation.id] }))} />
              </div>
            </div>;
          })}
          <div ref={bottom} />
        </div>
      </div>
      <form className="relative border-t p-3" onSubmit={(event) => { event.preventDefault(); if ((content.trim() || attachment) && !send.isPending) send.mutate(); }}>
        {mention !== null && (mentionContacts.data ?? []).length ? <div className="absolute bottom-full left-5 z-50 mb-2 max-h-64 w-72 overflow-y-auto rounded-xl border bg-popover p-1 shadow-xl">
          {(mentionContacts.data ?? []).map((contact) => <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-muted" key={contact.uuid} onClick={() => { setContent(insertMention(content, contact.name)); setMentions((current) => current.some((item) => item.uuid === contact.uuid) ? current : [...current, contact]); }} type="button"><Avatar name={contact.name} /><span className="min-w-0"><span className="block truncate text-sm font-medium">{contact.name}</span><span className="block truncate text-xs text-muted-foreground">{contact.email}</span></span></button>)}
        </div> : null}
        {attachment ? <div className="mx-auto mb-2 flex max-w-4xl items-center gap-3 rounded-xl border bg-muted/50 px-3 py-2"><FileText className="size-4"/><span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span><span className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</span><Button aria-label="Remove attachment" onClick={() => setAttachment(null)} size="icon" type="button" variant="ghost"><X className="size-4"/></Button></div> : null}
        <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-xl border bg-background p-2 shadow-sm">
          <input accept="image/*" className="hidden" onChange={(event) => void pickAttachment(event.target.files?.[0], "image")} ref={imageInput} type="file" />
          <input className="hidden" onChange={(event) => void pickAttachment(event.target.files?.[0])} ref={fileInput} type="file" />
          <Button aria-label="Attach image" onClick={() => imageInput.current?.click()} size="icon" title="Attach image" type="button" variant="ghost"><ImageIcon className="size-4"/></Button>
          <Button aria-label="Attach file" onClick={() => fileInput.current?.click()} size="icon" title="Attach file" type="button" variant="ghost"><Paperclip className="size-4"/></Button>
          <textarea className="min-h-10 max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" placeholder="Write a message" rows={1} value={content} onChange={(event) => setContent(event.target.value)} />
          {!content.trim() && !attachment ? <Button aria-label={recording ? "Stop voice note" : "Record voice note"} className={recording ? "bg-destructive text-destructive-foreground" : ""} onClick={() => void toggleRecording()} size="icon" title="Voice note" type="button" variant={recording ? "default" : "ghost"}>{recording ? <Square className="size-4 fill-current"/> : <Mic className="size-4"/>}</Button> : null}
          <Button aria-label="Send message" disabled={(!content.trim() && !attachment) || send.isPending} size="icon"><Send className="size-4" /></Button>
        </div>
      </form>
    </section>
  );
}

function DeliveryReceipt({ status }: { status: "sent" | "delivered" | "read" }) {
  if (status === "sent") return null;
  return status === "read"
    ? <CheckCheck aria-label="Read" className="size-3.5 text-sky-600" />
    : <Check aria-label="Delivered" className="size-3.5" />;
}

function MentionedContent({ content }: { content: string }) {
  return <>{content.split(/(@[^\s@]+)/gu).map((part, index) => part.startsWith("@")
    ? <strong className="font-semibold text-sky-700" key={`${part}-${index}`}>{part}</strong>
    : part)}</>;
}

function MessageAttachment({ attachment }: { attachment: MessagingAttachment }) {
  if (attachment.kind === "image") return <a href={attachment.dataUrl} download={attachment.name}><img alt={attachment.name} className="mt-2 max-h-72 max-w-full rounded-lg object-contain" src={attachment.dataUrl} /></a>;
  if (attachment.kind === "voice") return <audio className="mt-2 max-w-full" controls preload="metadata" src={attachment.dataUrl} />;
  return <a className="mt-2 flex items-center gap-2 rounded-lg border bg-background/70 px-3 py-2 text-sm font-medium hover:bg-background" download={attachment.name} href={attachment.dataUrl}><FileText className="size-4"/><span className="min-w-0 flex-1 truncate">{attachment.name}</span><span className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</span></a>;
}

function ConversationRow({ active, conversation, onClick }: { active: boolean; conversation: MessagingConversation; onClick: () => void }) { const title = conversationTitle(conversation, currentActorId()); return <button className={`flex w-full gap-3 border-b p-4 text-left ${active ? "bg-muted" : "hover:bg-muted/50"}`} onClick={onClick}><Avatar name={title}/><span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><strong className="truncate text-sm">{title}</strong><span className="shrink-0 text-xs text-muted-foreground">{conversation.lastMessage ? timeLabel(conversation.lastMessage.createdAt) : ""}</span></span><span className="flex items-center justify-between gap-2 pt-1"><span className="truncate text-sm text-muted-foreground">{conversation.lastMessage?.content ?? "Start the conversation"}</span>{conversation.unreadCount ? <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background">{conversation.unreadCount}</span> : null}</span></span></button>; }
function EmptyConversation() { return <div className="grid place-items-center p-8 text-center"><div><MessageCircle className="mx-auto size-10 text-muted-foreground"/><h2 className="pt-4 text-lg font-semibold">Start a conversation</h2><p className="pt-1 text-sm text-muted-foreground">Choose a contact to begin messaging.</p></div></div>; }
function Avatar({ name }: { name: string }) { return <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">{name.trim().charAt(0).toUpperCase() || "?"}</span>; }
function conversationTitle(conversation: MessagingConversation, actorId: string) { return conversation.title || conversation.members.filter((member) => member.uuid !== actorId).map((member) => member.name).join(", ") || "Conversation"; }
function timeLabel(value: string) { return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function currentActorId() { try { const token = window.localStorage.getItem("neot_session") ?? ""; return String((JSON.parse(atob(token.split(".")[1] ?? "")) as { userId?: string }).userId ?? ""); } catch { return ""; } }
function mentionQuery(value: string) { const match = value.match(/(?:^|\s)@([^\s@]*)$/u); return match ? match[1] ?? "" : null; }
function insertMention(value: string, name: string) { return value.replace(/@[^\s@]*$/u, `@${name} `); }
function mentionedIds(value: string, contacts: MessagingContact[]) { const normalized = value.toLocaleLowerCase(); return contacts.filter((contact) => normalized.includes(`@${contact.name.toLocaleLowerCase()}`)).map((contact) => contact.uuid); }
function readDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
function formatBytes(value: number) { return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }
