import { describe, expect, it } from "vitest";
import { conversationMarkerOffset, conversationMarkerTop } from "./conversation-rail";

describe("conversation rail", () => {
  it("centres a compact stack of message markers", () => {
    expect(conversationMarkerOffset(0, 3)).toBe(-18);
    expect(conversationMarkerOffset(1, 3)).toBe(0);
    expect(conversationMarkerOffset(2, 3)).toBe(18);
  });

  it("keeps a single message marker at the vertical centre", () => {
    expect(conversationMarkerOffset(0, 1)).toBe(0);
  });

  it("creates valid CSS positions for markers above and below centre", () => {
    expect(conversationMarkerTop(-18)).toBe("calc(50% - 18px)");
    expect(conversationMarkerTop(18)).toBe("calc(50% + 18px)");
  });
});
