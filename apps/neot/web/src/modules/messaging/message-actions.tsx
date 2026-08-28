import { ChevronDown, Copy, SmilePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MessagingMessage } from "./messaging.types";

const reactions = ["👍", "❤️", "😂", "😮", "😢", "🙏", "😀", "😍", "🥳", "🤔", "👏", "🔥", "✅", "💯", "🎉", "👀", "💪", "🙌"] as const;

export function MessageActions({ message, onReact }: { message: MessagingMessage; onReact: (emoji: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [emojisOpen, setEmojisOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open && !emojisOpen) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(false); setEmojisOpen(false); } };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [emojisOpen, open]);
  const ownReaction = message.reactions.find((reaction) => reaction.userId === currentActorId())?.emoji ?? null;
  const react = (emoji: string) => onReact(emoji === ownReaction ? null : emoji);
  return <div ref={root}>
    <button aria-expanded={open} aria-label="Message actions" className="absolute right-1 top-1 z-20 grid size-7 place-items-center rounded-full bg-inherit opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 focus:opacity-100" onClick={() => setOpen((value) => !value)} type="button"><ChevronDown className="size-4" /></button>
    {open ? <div className="absolute right-1 top-8 z-50 w-56 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl" role="menu">
      <div className="flex items-center gap-1 border-b px-1 pb-2">{reactions.slice(0, 6).map((emoji) => <button className="grid size-8 place-items-center rounded-full text-lg hover:bg-muted" key={emoji} onClick={() => { react(emoji); setOpen(false); }} type="button">{emoji}</button>)}</div>
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setOpen(false); setEmojisOpen(true); }} type="button"><SmilePlus className="size-4" />More reactions</button>
      <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setOpen(false); void navigator.clipboard.writeText(message.content); }} type="button"><Copy className="size-4" />Copy</button>
    </div> : null}
    {emojisOpen ? <div className="absolute right-1 top-8 z-50 grid w-56 grid-cols-6 gap-1 rounded-xl border bg-popover p-2 shadow-xl">{reactions.map((emoji) => <button className="grid size-8 place-items-center rounded-lg text-lg hover:bg-muted" key={emoji} onClick={() => { react(emoji); setEmojisOpen(false); }} type="button">{emoji}</button>)}</div> : null}
    {message.reactions.length ? <span className="absolute -bottom-3 right-2 rounded-full border bg-background px-1.5 py-0.5 text-sm shadow-sm">{[...new Set(message.reactions.map((reaction) => reaction.emoji))].join(" ")}</span> : null}
  </div>;
}

function currentActorId() { try { const token = window.localStorage.getItem("neot_session") ?? ""; return String((JSON.parse(atob(token.split(".")[1] ?? "")) as { userId?: string }).userId ?? ""); } catch { return ""; } }
