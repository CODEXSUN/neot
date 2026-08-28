import { describe, expect, it } from "vitest";
import { resourcesForActivity } from "./startup-scheduler";

describe("desktop startup resources", () => {
  it("keeps the agent chat free of workspace probes", () => {
    expect(resourcesForActivity("assist")).toEqual({
      changes: false,
      files: false,
      system: false
    });
  });

  it("loads only the resource owned by the selected surface", () => {
    expect(resourcesForActivity("files").files).toBe(true);
    expect(resourcesForActivity("git").changes).toBe(true);
    expect(resourcesForActivity("docker").system).toBe(true);
  });
});
