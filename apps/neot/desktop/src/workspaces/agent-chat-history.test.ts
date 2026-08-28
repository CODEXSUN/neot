import { describe, expect, it } from "vitest";
import { historyMenuPosition } from "./agent-chat-history";

describe("agent chat history", () => {
  it("opens a bottom-row menu upward inside the viewport", () => {
    expect(historyMenuPosition({ bottom: 590, right: 270, top: 563 }, { height: 600, width: 280 })).toEqual({
      left: 120,
      top: 559,
      transform: "translateY(-100%)"
    });
  });

  it("opens a top-row menu below its action button", () => {
    expect(historyMenuPosition({ bottom: 80, right: 270, top: 53 }, { height: 600, width: 280 })).toEqual({
      left: 120,
      top: 84,
    });
    expect(historyMenuPosition({ bottom: 80, right: 270, top: 53 }, { height: 600, width: 280 })).not.toHaveProperty("transform");
  });
});
