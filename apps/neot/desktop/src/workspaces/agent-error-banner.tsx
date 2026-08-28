import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AgentErrorBanner({ message }: { message: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  async function copyError() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="agent-error" role="alert">
      <X size={14} />
      <span>{message}</span>
      <button
        aria-label={copied ? "Error copied" : "Copy error"}
        onClick={() => void copyError()}
        title={copied ? "Copied" : "Copy error"}
        type="button"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}
