import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompassRunnerWorkspace } from "./compass-runner-workspace";

describe("Compass Runner workspace", () => {
  it("renders the standalone release worker without requiring desktop services", () => {
    const page = renderToStaticMarkup(<CompassRunnerWorkspace />);
    expect(page).toContain("Compass Runner");
    expect(page).toContain("Prepare NEOT IDE release");
    expect(page).toContain("Preflight");
    expect(page).toContain("Publish and verify");
    expect(page).toContain("Inspect repository");
    expect(page).toContain("Live console");
    expect(page).toContain("Previous runs");
  });
});
