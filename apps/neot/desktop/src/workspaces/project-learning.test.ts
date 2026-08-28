import { describe, expect, it } from "vitest";
import { buildAgentPrompt } from "./agent-context";

describe("project learning prompt", () => {
  it("keeps the user request unchanged without approved facts", () => {
    expect(buildAgentPrompt("Fix the tests", "", [])).toBe("Fix the tests");
  });

  it("separates approved facts from the user request", () => {
    const prompt = buildAgentPrompt(
      "Fix the tests",
      "<project_learning>Use npm.</project_learning>",
      []
    );
    expect(prompt).toContain("<project_learning>Use npm.</project_learning>");
    expect(prompt).toContain("<user_request>\nFix the tests\n</user_request>");
  });
});
