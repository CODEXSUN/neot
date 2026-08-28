import { describe, expect, it } from "vitest";
import { formatMessageTime } from "./agent-message-actions";

describe("agent message actions", () => {
  it("formats persisted UTC timestamps with the requested local date and time", () => {
    expect(formatMessageTime("2026-08-15 18:23:00", "en-GB", "Asia/Kolkata")).toBe("15 Aug 2026, 23:53");
  });

  it("hides invalid timestamps", () => {
    expect(formatMessageTime("not-a-time")).toBe("");
  });
});
