import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { RefObject } from "react";

type RailMessage = { id: string };
type RailMessageHeader = {
  active: boolean;
  id: string;
  offset: number;
  summary: string;
  title: string;
};

export function ConversationRail({
  messages,
  transcript
}: {
  messages: RailMessage[];
  transcript: RefObject<HTMLDivElement | null>;
}) {
  const [headers, setHeaders] = useState<RailMessageHeader[]>([]);
  const [previewId, setPreviewId] = useState<string | undefined>();

  useEffect(() => {
    const element = transcript.current;
    if (!element || !messages.length) {
      setHeaders([]);
      return;
    }

    let frame = 0;
    const update = () => {
      const articles = messageArticles(element);
      setHeaders(articles.map((article, index) => {
        const top = relativeTop(article, element);
        return {
          active: isVisible(top, article.offsetHeight, element),
          id: railMessageId(article, index),
          offset: conversationMarkerOffset(index, articles.length),
          summary: messagePreview(article),
          title: messageHeader(article)
        };
      }));
      for (const article of articles) observer.observe(article);
    };
    const requestUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(requestUpdate);
    const mutations = new MutationObserver(requestUpdate);

    observer.observe(element);
    mutations.observe(element, { childList: true, characterData: true, subtree: true });
    element.addEventListener("scroll", requestUpdate, { passive: true });
    requestUpdate();

    return () => {
      window.cancelAnimationFrame(frame);
      element.removeEventListener("scroll", requestUpdate);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [messages, transcript]);

  if (!headers.length) return null;

  return (
    <nav aria-label="Conversation messages" className="conversation-rail">
      {headers.map((header) => {
        const expanded = previewId === header.id;
        return (
          <div className="conversation-rail-marker" key={header.id} style={{ top: conversationMarkerTop(header.offset) }}>
            <motion.button
              animate={{ opacity: expanded || header.active ? 1 : 0.62, scale: expanded ? 1.2 : 1, width: expanded ? 38 : 13 }}
              aria-label={`Go to ${header.title} message`}
              className={header.active ? "active" : ""}
              onBlur={() => setPreviewId(undefined)}
              onClick={() => jumpToMessage(transcript.current, header.id)}
              onFocus={() => setPreviewId(header.id)}
              onMouseEnter={() => setPreviewId(header.id)}
              onMouseLeave={() => setPreviewId(undefined)}
              transition={{ damping: 21, stiffness: 460, type: "spring" }}
              type="button"
            />
            <AnimatePresence>
              {expanded ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="conversation-rail-preview"
                  exit={{ opacity: 0, scale: 0.96, x: -8 }}
                  initial={{ opacity: 0, scale: 0.96, x: -8 }}
                  transition={{ damping: 22, stiffness: 420, type: "spring" }}
                >
                  <strong>{header.title}</strong>
                  <span>{header.summary}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

export function conversationMarkerOffset(index: number, count: number) {
  return (index - (count - 1) / 2) * 18;
}

export function conversationMarkerTop(offset: number) {
  return offset < 0 ? `calc(50% - ${Math.abs(offset)}px)` : `calc(50% + ${offset}px)`;
}

function messageArticles(element: HTMLDivElement) {
  return Array.from(element.querySelectorAll<HTMLElement>("[data-message-id]"));
}

function railMessageId(article: HTMLElement, index: number) {
  const id = article.dataset.messageId ?? `message-${index}`;
  article.dataset.railMessageId = id;
  return id;
}

function messageHeader(article: HTMLElement) {
  return article.firstElementChild?.textContent?.trim() || "Conversation";
}

function messagePreview(article: HTMLElement) {
  const content = article.querySelector<HTMLElement>(".agent-response, p")?.textContent?.trim() ?? "";
  return content.slice(0, 120) || "Open this message";
}

function relativeTop(element: HTMLElement, transcript: HTMLDivElement) {
  return element.getBoundingClientRect().top - transcript.getBoundingClientRect().top + transcript.scrollTop;
}

function isVisible(top: number, height: number, transcript: HTMLDivElement) {
  const bottom = top + height;
  return bottom >= transcript.scrollTop && top <= transcript.scrollTop + transcript.clientHeight;
}

function jumpToMessage(transcript: HTMLDivElement | null, id: string) {
  const message = transcript?.querySelector<HTMLElement>(`[data-rail-message-id="${id}"]`);
  if (!message || !transcript) return;
  transcript.scrollTo({ behavior: "smooth", top: Math.max(0, relativeTop(message, transcript) - 16) });
}
