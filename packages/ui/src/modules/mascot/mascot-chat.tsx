import { ArrowUpIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { MascotChatConfig, MascotChatConversation } from "./mascot.contract";

export function MascotChat({ chat, initialConversation, onClose, onConversationChange }: { chat: MascotChatConfig; initialConversation?: MascotChatConversation | null; onClose: () => void; onConversationChange?: (conversation: MascotChatConversation) => void }) {
  const [conversation, setConversation] = useState<MascotChatConversation | null>(initialConversation ?? null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (initialConversation) {
      setConversation(initialConversation);
      return;
    }
    void chat.load(null).then(setConversation).catch(() => setError("Honey chat is unavailable."));
  }, [chat, initialConversation]);
  const preview = conversation?.messages.slice(-3) ?? [];

  async function send() {
    if (!message.trim() || pending) return;
    const body = message.trim(); setMessage(""); setPending(true); setError("");
    try {
      const next = await chat.send(body, conversation?.id ?? null);
      setConversation(next);
      onConversationChange?.(next);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Honey could not answer."); }
    finally { setPending(false); }
  }

  return <section className="pointer-events-auto absolute bottom-full left-1/2 mb-3 flex w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-3xl border border-amber-200/70 bg-[#fffaf0]/98 shadow-xl backdrop-blur dark:border-amber-200/15 dark:bg-[#272219]/98" onPointerDown={(event) => event.stopPropagation()}>
    <header className="flex items-center gap-2 border-b border-amber-200/50 px-4 py-3"><div className="flex-1"><h2 className="text-sm font-semibold">Honey</h2><p className="text-xs text-stone-500 dark:text-amber-100/60">Latest three messages</p></div><a aria-label="Open full Honey Chat" className="rounded-full p-2 hover:bg-amber-100 dark:hover:bg-amber-100/10" href={chat.href}><ExternalLinkIcon className="size-4"/></a><button aria-label="Close quick chat" className="rounded-full p-2 hover:bg-amber-100 dark:hover:bg-amber-100/10" onClick={onClose} type="button"><XIcon className="size-4"/></button></header>
    <div className="flex max-h-60 flex-col gap-2 overflow-y-auto p-3">{preview.length ? preview.map((item) => <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-5 ${item.role === "user" ? "ml-auto rounded-br-md bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900" : "rounded-bl-md bg-amber-100/70 text-stone-900 dark:bg-amber-100/10 dark:text-amber-50"}`} key={item.id}>{item.body}</div>) : <p className="px-2 py-4 text-center text-xs text-stone-500">Hi, I’m Honey. How can I help?</p>}{pending ? <p className="text-xs text-stone-500">Honey is thinking…</p> : null}{error ? <p className="text-xs text-red-600">{error}</p> : null}</div>
    <form className="flex gap-2 border-t border-amber-200/50 p-3" onSubmit={(event) => { event.preventDefault(); void send(); }}><input aria-label="Message Honey" className="h-9 min-w-0 flex-1 rounded-full border border-amber-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber-400 dark:bg-stone-900" placeholder="Ask Honey…" value={message} onChange={(event) => setMessage(event.target.value)}/><button aria-label="Send to Honey" className="flex size-9 items-center justify-center rounded-full bg-amber-500 text-stone-950 disabled:opacity-50" disabled={!message.trim() || pending} type="submit"><ArrowUpIcon className="size-4"/></button></form>
  </section>;
}
