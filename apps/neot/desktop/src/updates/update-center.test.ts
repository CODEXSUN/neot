import { describe, expect, it } from "vitest";
import { shouldCheckWhenOpened } from "./update-center";

describe("desktop update center", () => {
  it("checks again when the version control is opened from a settled state", () => {
    expect(shouldCheckWhenOpened("idle")).toBe(true);
    expect(shouldCheckWhenOpened("current")).toBe(true);
    expect(shouldCheckWhenOpened("unavailable")).toBe(true);
  });

  it("preserves an active or downloaded update", () => {
    expect(shouldCheckWhenOpened("checking")).toBe(false);
    expect(shouldCheckWhenOpened("downloading")).toBe(false);
    expect(shouldCheckWhenOpened("installing")).toBe(false);
    expect(shouldCheckWhenOpened("ready")).toBe(false);
  });
});
