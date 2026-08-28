import { describe, expect, it } from "vitest";
import { reviewIsCurrent } from "./change-review";

describe("change review", () => {
  it("accepts only the fingerprint that was reviewed", () => {
    expect(reviewIsCurrent("abc", "abc")).toBe(true);
    expect(reviewIsCurrent("abc", "def")).toBe(false);
  });

  it("requires both fingerprints", () => {
    expect(reviewIsCurrent(undefined, "abc")).toBe(false);
    expect(reviewIsCurrent("abc", undefined)).toBe(false);
  });
});
