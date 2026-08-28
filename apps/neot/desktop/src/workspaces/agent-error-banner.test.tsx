import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentErrorBanner } from "./agent-error-banner";

describe("agent error banner", () => {
  it("presents the error with an accessible copy action", () => {
    const html = renderToStaticMarkup(<AgentErrorBanner message="Connector failed" />);

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-label="Copy error"');
    expect(html).toContain("Connector failed");
  });
});
