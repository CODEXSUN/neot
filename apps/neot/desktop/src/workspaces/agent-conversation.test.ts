import { describe, expect, it } from "vitest";
import { groupAgentMessages, mergeAgentText } from "./agent-conversation";

describe("agent conversation", () => {
  it("groups sequential agent items into one response", () => {
    expect(groupAgentMessages([
      { createdAt: "1", id: "u", role: "user", text: "How would you code NEOT?" },
      { createdAt: "2", id: "a1", role: "agent", text: "I will ground this in the repository." },
      { createdAt: "3", id: "a2", role: "agent", text: "Use complete module ownership." }
    ])).toEqual([
      { createdAt: "1", id: "u", role: "user", text: "How would you code NEOT?" },
      { createdAt: "2", id: "a1", role: "agent", text: "I will ground this in the repository.\n\nUse complete module ownership." }
    ]);
  });

  it("does not duplicate a streamed completion", () => {
    expect(mergeAgentText("The result is ready.", "The result is ready.")).toBe("The result is ready.");
  });
});
