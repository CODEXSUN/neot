import { describe, expect, it } from "vitest";
import { AGENT_DISCUSSION_ACCESS, discussionPrompt } from "./agent-discussion-policy";

describe("agent discussion policy", () => {
  it("keeps repository discussions read-only", () => {
    expect(AGENT_DISCUSSION_ACCESS).toBe("readOnly");
  });

  it("directs implementation requests to the Project Coder Agent", () => {
    expect(discussionPrompt("Fix the release flow")).toContain("open its Coder Agent");
  });
});
