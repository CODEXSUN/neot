import { Agent, Runner } from "@openai/agents";
import type { LaunchDeskInput } from "./orchestration.schemas.js";
import { formatLaunchDeskInput, launchDeskInstructions } from "./launch-desk.definition.js";
import { launchDeskTools } from "./launch-desk.tools.js";

export type LaunchDeskStreamEvent =
  | { type: "run.started"; model: string; trace: boolean }
  | { type: "tool.progress"; name: string; status: "started" | "completed" }
  | { type: "text.delta"; delta: string }
  | { type: "run.completed" }
  | { type: "run.failed"; message: string };

export class LaunchDeskAgent {
  private readonly runner = new Runner({
    workflowName: "Launch Desk planning",
    traceIncludeSensitiveData: false
  });

  async *stream(input: LaunchDeskInput): AsyncGenerator<LaunchDeskStreamEvent> {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-terra";
    const agent = new Agent({
      name: "Launch Desk",
      instructions: launchDeskInstructions,
      model,
      tools: launchDeskTools
    });

    yield { type: "run.started", model, trace: true };
    try {
      const result = await this.runner.run(agent, formatLaunchDeskInput(input), {
        stream: true
      });
      for await (const event of result) {
        if (event.type === "run_item_stream_event" && event.name === "tool_called") {
          yield { type: "tool.progress", name: toolName(event.item), status: "started" };
        }
        if (event.type === "run_item_stream_event" && event.name === "tool_output") {
          yield { type: "tool.progress", name: toolName(event.item), status: "completed" };
        }
        if (event.type === "raw_model_stream_event") {
          const data = event.data as { type?: string; delta?: unknown };
          if (data.type === "response.output_text.delta" && typeof data.delta === "string") {
            yield { type: "text.delta", delta: data.delta };
          }
        }
      }
      await result.completed;
      yield { type: "run.completed" };
    } catch (error) {
      yield {
        type: "run.failed",
        message: error instanceof Error ? error.message : "Launch planning failed."
      };
    }
  }
}

function toolName(item: unknown) {
  if (item && typeof item === "object") {
    const value = item as { rawItem?: { name?: unknown }; name?: unknown };
    if (typeof value.rawItem?.name === "string") return value.rawItem.name;
    if (typeof value.name === "string") return value.name;
  }
  return "launch_tool";
}
