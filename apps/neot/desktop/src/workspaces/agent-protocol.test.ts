import { describe, expect, it } from "vitest";
import {
  agentErrorFrom,
  actionChoicesFrom,
  asksForTextInput,
  choiceQuestionFrom,
  extractTextAt,
  parseAgentProtocolMessage,
  runItemFrom,
  threadIdFrom
} from "./agent-protocol";

describe("agent protocol boundary", () => {
  it("accepts a valid Codex event and reads its thread", () => {
    const message = parseAgentProtocolMessage({
      id: 7,
      result: { thread: { id: "thread-7" } }
    });

    expect(message).toBeDefined();
    expect(threadIdFrom(message!)).toBe("thread-7");
  });

  it("rejects malformed event payloads", () => {
    expect(parseAgentProtocolMessage("agent.started")).toBeUndefined();
    expect(parseAgentProtocolMessage({ id: "wrong" })).toBeUndefined();
  });

  it("does not present diagnostic stderr output as an agent failure", () => {
    expect(
      agentErrorFrom({ method: "runtime/log", params: { message: "Output:" } })
    ).toBeUndefined();
  });

  it("presents explicit protocol and runtime failures", () => {
    expect(agentErrorFrom({ error: { message: "Request failed" }, id: 9 })).toBe(
      "Request failed"
    );
    expect(
      agentErrorFrom({ method: "runtime/error", params: { message: "Engine stopped" } })
    ).toBe("Engine stopped");
    expect(
      agentErrorFrom({ method: "error", params: { error: { message: "Model is unavailable" } } })
    ).toBe("Model is unavailable");
    expect(
      agentErrorFrom({ method: "turn/completed", params: { turn: { error: { message: "Turn failed" } } } })
    ).toBe("Turn failed");
  });

  it("normalizes tool activity for the event stream", () => {
    const message = parseAgentProtocolMessage({
      method: "item/completed",
      params: {
        item: { id: "tool-1", status: "completed", tool: "read_file", type: "mcpToolCall" }
      }
    });

    expect(runItemFrom(message!)).toEqual({
      id: "tool-1",
      label: "read_file",
      status: "completed",
      type: "mcpToolCall"
    });
  });

  it("reads only the final assistant item shape used by the App Server", () => {
    const message = parseAgentProtocolMessage({
      method: "item/completed",
      params: { item: { type: "agentMessage", text: "186" }, threadId: "thread-7" }
    });

    expect(extractTextAt(message, "params", "item", "text")).toBe("186");
    expect(threadIdFrom(message!)).toBe("thread-7");
  });

  it("extracts generic button actions from a completed question", () => {
    const text = "Does it feel more **warm** or **cool**?\n\n- Warm\n- Cool";

    expect(actionChoicesFrom(text)).toEqual(["Warm", "Cool"]);
    expect(choiceQuestionFrom(text)).toBe("Does it feel more **warm** or **cool**?");
    expect(actionChoicesFrom("186")).toEqual([]);
  });

  it("recognizes inline boolean choices and text questions", () => {
    expect(actionChoicesFrom("Do you approve? Yes or No?")).toEqual(["Yes", "No"]);
    expect(actionChoicesFrom("Is this true or false?")).toEqual(["True", "False"]);
    expect(actionChoicesFrom("Continue? Y/N?")).toEqual(["Y", "N"]);
    expect(asksForTextInput("What colour are you thinking of?")).toBe(true);
    expect(asksForTextInput("The result is 186.")).toBe(false);
  });
});
