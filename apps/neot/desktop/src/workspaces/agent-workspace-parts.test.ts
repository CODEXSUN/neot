import { describe, expect, it } from "vitest";
import { isActiveRunItem, type RunItem } from "./agent-workspace-parts";

function runItem(status: string): RunItem {
  return { id: status, label: "Inspect workspace", status, type: "commandExecution" };
}

describe("agent execution rail", () => {
  it("keeps unfinished activity visible", () => {
    expect(isActiveRunItem(runItem("inProgress"))).toBe(true);
    expect(isActiveRunItem(runItem("running"))).toBe(true);
  });

  it("allows terminal activity to collapse", () => {
    expect(isActiveRunItem(runItem("completed"))).toBe(false);
    expect(isActiveRunItem(runItem("failed"))).toBe(false);
    expect(isActiveRunItem(runItem("cancelled"))).toBe(false);
  });
});
