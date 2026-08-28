import { Button } from "@neot/ui/components/button";
import { Textarea } from "@neot/ui/components/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp, MessageCircle, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendTelegramMessage, telegramMessages, telegramStatus } from "./telegram-support.services";

export function TelegramChatWorkspace() {
  const [body, setBody] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ["telegram-status"], queryFn: telegramStatus });
  const messages = useQuery({
    queryKey: ["telegram-messages"],
    queryFn: telegramMessages,
    enabled: status.data?.connected === true,
    refetchInterval: 3000
  });
  const send = useMutation({
    mutationFn: sendTelegramMessage,
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["telegram-messages"] });
    }
  });
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data]);
  if (status.data && !status.data.connected)
    return (
      <main className="flex min-h-[70vh] items-center justify-center p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-sky-100 p-4 text-sky-700">
            <Smartphone className="size-7" />
          </div>
          <h1 className="text-2xl font-semibold">Connect Telegram first</h1>
          <p className="text-muted-foreground">
            Pair your mobile account before opening the shared support conversation.
          </p>
          <Button asChild>
            <a href="/app/neot/telegram-connect">Open connection page</a>
          </Button>
        </div>
      </main>
    );
  return (
    <main className="mx-auto flex h-[calc(100vh-7rem)] w-full max-w-5xl flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-3 border-b px-7 py-5">
        <div className="rounded-full bg-sky-500 p-2 text-white">
          <MessageCircle className="size-5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-semibold">NEOT Support</h1>
          <p className="text-xs text-emerald-600">
            {status.data?.connected ? "Connected to Telegram" : "Checking connection…"}
          </p>
        </div>
      </header>
      <section
        className="flex flex-1 flex-col gap-3 overflow-y-auto bg-muted/20 p-8"
        aria-live="polite"
      >
        {(messages.data ?? []).map((message) => (
          <div
            key={message.id}
            className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${message.direction === "outbound" ? "rounded-br-md bg-sky-500 text-white" : "rounded-bl-md bg-background shadow-sm"}`}
            >
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <time
                className={`mt-1 block text-right text-[11px] ${message.direction === "outbound" ? "text-sky-100" : "text-muted-foreground"}`}
              >
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </time>
            </div>
          </div>
        ))}
        {messages.isPending ? (
          <div className="m-auto text-center text-sm text-muted-foreground">
            Loading Telegram messages…
          </div>
        ) : null}
        {messages.error ? (
          <div className="m-auto max-w-md text-center text-sm text-destructive">
            {messages.error.message}
          </div>
        ) : null}
        {!messages.isPending && !messages.error && !messages.data?.length ? (
          <div className="m-auto text-center text-sm text-muted-foreground">
            Messages sent from this workspace appear in your Telegram Saved Messages.
          </div>
        ) : null}
        <div ref={end} />
      </section>
      <form
        className="flex items-end gap-3 border-t bg-background p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim()) send.mutate(body);
        }}
      >
        <Textarea
          aria-label="Message"
          className="max-h-32 min-h-11 resize-none rounded-2xl"
          placeholder="Message NEOT Support"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (body.trim()) send.mutate(body);
            }
          }}
        />
        <Button
          aria-label="Send message"
          className="size-11 shrink-0 rounded-full bg-sky-500 p-0 hover:bg-sky-600"
          disabled={send.isPending || !body.trim()}
        >
          <ArrowUp className="size-5" />
        </Button>
      </form>
    </main>
  );
}
