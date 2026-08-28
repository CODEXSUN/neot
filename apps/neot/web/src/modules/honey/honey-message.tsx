import { motion } from "framer-motion";
import { AlertCircleIcon, BotIcon, FolderOpenIcon, RocketIcon, SparklesIcon, SquareCheckBigIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { HoneyAction, HoneyMessage } from "./honey.types";
import { HoneyFace } from "./honey-face";

export function HoneyMessageBubble({ animateAnswer = false, item, onProgress, onPrompt }: { animateAnswer?: boolean; item: HoneyMessage; onProgress?: () => void; onPrompt?: (prompt: string) => void }) {
  const capabilityAnswer = item.role === "assistant" && /navigate projects|skills\/plugins|Project Agent/iu.test(item.body);
  if (item.role === "assistant" && /thread not found|timed out|app server/iu.test(item.body)) return null;
  return <motion.div animate={{ opacity: 1, y: 0 }} className={`flex items-end gap-2 ${item.role === "user" ? "justify-end" : "justify-start"}`} initial={{ opacity: 0, y: 12 }} layout transition={{ duration: 0.26, ease: "easeOut" }}>
    {item.role === "assistant" ? <HoneyFace /> : null}
    <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "rounded-br-md bg-stone-900 text-white shadow-sm dark:bg-stone-100 dark:text-stone-900" : "rounded-bl-md bg-amber-50 text-stone-900 shadow-[0_8px_24px_rgba(120,88,24,0.08)] dark:bg-amber-950/30 dark:text-stone-100"}`}>
      {item.role === "user" ? item.body : <><div>{capabilityAnswer ? <CapabilitySummary /> : animateAnswer ? <TypingAnswer {...(onProgress ? { onProgress } : {})} text={item.body} /> : <HighlightedText text={item.body} />}</div>{item.actions?.length ? <HoneyActions actions={item.actions} {...(onPrompt ? { onPrompt } : {})} /> : null}</>}
    </div>
  </motion.div>;
}

function HoneyActions({ actions, onPrompt }: { actions: HoneyAction[]; onPrompt?: (prompt: string) => void }) {
  return <div aria-label="Recommended actions" className="mt-3 grid gap-2 border-t border-amber-200/70 pt-3 dark:border-amber-800/50">{actions.map((action, index) => {
    const content = <><ActionIcon id={action.id} /><span>{action.label}</span><span aria-hidden="true" className="ml-auto text-amber-700">→</span></>;
    const className = "flex min-h-10 items-center gap-2 rounded-xl border border-amber-300/80 bg-white/80 px-3 py-2 text-left text-xs font-medium shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-800 dark:bg-stone-950/40 dark:hover:bg-amber-950/50";
    return <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 6 }} key={action.id} transition={{ delay: index * 0.06 }}>{action.href ? <a className={className} href={action.href}>{content}</a> : <button className={className} onClick={() => action.prompt && onPrompt?.(action.prompt)} type="button">{content}</button>}</motion.div>;
  })}</div>;
}

function ActionIcon({ id }: { id: HoneyAction["id"] }) {
  const Icon = { "explain-error": AlertCircleIcon, "open-project": FolderOpenIcon, "review-deployment": RocketIcon, "start-agent": BotIcon, "view-task": SquareCheckBigIcon }[id];
  return <Icon className="size-4 shrink-0 text-amber-700 dark:text-amber-300" />;
}

export function HoneyThinking() {
  const stages = ["Understanding your question", "Finding the clearest next step", "Preparing your answer"];
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStage((value) => (value + 1) % stages.length), 1400);
    return () => window.clearInterval(timer);
  }, [stages.length]);
  return <motion.div animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 text-sm text-muted-foreground" initial={{ opacity: 0, y: 8 }} layout>
    <span className="relative flex size-8 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30"><SparklesIcon className="size-4 animate-pulse"/><span className="absolute inset-0 animate-ping rounded-full border border-amber-300/50" /></span>
    <span key={stage} className="animate-in fade-in slide-in-from-bottom-1 duration-300">{stages[stage]}<ThinkingDots /></span>
  </motion.div>;
}

function TypingAnswer({ onProgress, text }: { onProgress?: () => void; text: string }) {
  const cleanText = stripMarkdown(text);
  const [length, setLength] = useState(0);
  useEffect(() => {
    setLength(0);
    const step = Math.max(2, Math.ceil(cleanText.length / 90));
    const timer = window.setInterval(() => setLength((value) => {
      const next = Math.min(cleanText.length, value + step);
      onProgress?.();
      if (next === cleanText.length) window.clearInterval(timer);
      return next;
    }), 22);
    return () => window.clearInterval(timer);
  }, [cleanText, onProgress]);
  return <p className="whitespace-pre-wrap">{length >= cleanText.length ? <HighlightedText text={cleanText} /> : <>{cleanText.slice(0, length)}<span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-600 align-middle" /></>}</p>;
}

function HighlightedText({ text }: { text: string }) {
  const parts = stripMarkdown(text).split(/(Honey|next step|project|settings|skills|troubleshoot|workspace)/giu);
  return <>{parts.map((part, index) => /^(Honey|next step|project|settings|skills|troubleshoot|workspace)$/iu.test(part) ? <mark className="rounded bg-amber-200/60 px-0.5 text-inherit dark:bg-amber-700/35" key={`${part}-${index}`}>{part}</mark> : part)}</>;
}

function ThinkingDots() {
  return <span aria-hidden="true" className="inline-flex w-5 gap-0.5 pl-1">{[0, 1, 2].map((index) => <span className="size-1 animate-bounce rounded-full bg-current" key={index} style={{ animationDelay: `${index * 120}ms` }} />)}</span>;
}

function stripMarkdown(value: string) {
  return value.replace(/\*\*(.*?)\*\*/gu, "$1").replace(/`([^`]+)`/gu, "$1");
}

function CapabilitySummary() {
  return <div><p className="font-medium">I&apos;m ready to help. Choose where to begin:</p><div className="flex flex-wrap gap-2 pt-3">{["Navigate projects", "Explain settings", "Troubleshoot", "Manage skills", "Plan next steps"].map((label, index) => <motion.span animate={{ opacity: 1, scale: 1 }} className="rounded-full border border-amber-300 bg-white/75 px-2.5 py-1 text-xs font-medium dark:border-amber-800 dark:bg-stone-900/50" initial={{ opacity: 0, scale: 0.9 }} key={label} transition={{ delay: index * 0.06 }}>{label}</motion.span>)}</div><p className="pt-3 text-xs text-muted-foreground">For hands-on changes, ask Honey to guide you to the right workspace.</p></div>;
}
