import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AgentMarkdown } from "./agent-markdown";

describe("agent markdown", () => {
  it("renders GitHub-flavored response content", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown text={"## Result\n\n- [x] Checked\n\n| File | State |\n| --- | --- |\n| app.ts | Ready |"} />
    );

    expect(html).toContain("<h2>Result</h2>");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("<table>");
  });

  it("does not render raw HTML from model output", () => {
    const html = renderToStaticMarkup(
      <AgentMarkdown text={'Safe text<script>alert("unsafe")</script>'} />
    );

    expect(html).toContain("Safe text");
    expect(html).not.toContain("<script>");
    expect(html).toContain("unsafe");
  });
});
