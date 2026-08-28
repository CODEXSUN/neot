import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AgentMessageActions({ createdAt, text }: { createdAt: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="agent-message-actions">
      <time dateTime={createdAt}>{formatMessageTime(createdAt)}</time>
      <button
        aria-label={copied ? "Message copied" : "Copy message"}
        onClick={() => void copyMessage()}
        title={copied ? "Copied" : "Copy message"}
        type="button"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export function formatMessageTime(value: string, locale?: string, timeZone?: string) {
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    timeZone,
    year: "numeric"
  }).format(date);
}
