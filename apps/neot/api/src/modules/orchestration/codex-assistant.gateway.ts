import type { CodexNotification } from "./codex-app-server.client.js";
import { codexAppServer } from "./codex-connector.pool.js";

class CodexAssistantGateway {
  async ask(input: { message: string; system: string; threadId: string | null }) {
    const cwd = process.cwd();
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra";
    const prompt = `${input.system}\n\nUser message:\n${input.message}`;
    if (input.threadId) {
      try {
        return await askInThread(input.threadId, cwd, model, prompt);
      } catch (error) {
        if (!isMissingThread(error)) throw error;
      }
    }
    const threadId = await codexAppServer.startThread(cwd, model, "read-only");
    return askInThread(threadId, cwd, model, prompt);
  }
}

async function askInThread(threadId: string, cwd: string, model: string, prompt: string) {
    let answer = "";
    let unsubscribe = () => false;
    let timer: NodeJS.Timeout | undefined;
    const completion = new Promise<string>((resolve, reject) => {
      unsubscribe = codexAppServer.subscribe((notification) => {
        const event = assistantEvent(notification, threadId);
        if (!event) return;
        if (event.type === "delta") answer += event.value;
        if (event.type === "failed") { finish(); reject(new Error(event.value)); }
        if (event.type === "complete") { finish(); resolve(answer.trim() || "I could not form a response."); }
      });
      timer = setTimeout(() => { finish(); reject(new Error("Honey timed out while waiting for a response.")); }, 120_000);
      timer.unref();
    });
    try {
      await codexAppServer.startTurn(threadId, cwd, [{ type: "text", text: prompt }], model, "read-only");
    } catch (error) {
      finish();
      throw error;
    }
    return { message: await completion, threadId };

    function finish() {
      unsubscribe();
      if (timer) clearTimeout(timer);
    }
  }

function isMissingThread(error: unknown) {
  return error instanceof Error && /thread not found|unknown thread/iu.test(error.message);
}

function assistantEvent(notification: CodexNotification, threadId: string) {
  const params = notification.params as { delta?: string; threadId?: string; turn?: { error?: { message?: string }; status?: string } } | undefined;
  if (params?.threadId !== threadId) return null;
  if (notification.method === "item/agentMessage/delta" && typeof params.delta === "string") return { type: "delta" as const, value: params.delta };
  if (notification.method !== "turn/completed") return null;
  if (params.turn?.error?.message) return { type: "failed" as const, value: params.turn.error.message };
  return { type: "complete" as const, value: params.turn?.status ?? "completed" };
}

export const codexAssistantGateway = new CodexAssistantGateway();
