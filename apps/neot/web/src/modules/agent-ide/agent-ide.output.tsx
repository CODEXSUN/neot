import { useEffect, useState } from "react";

export function AgentPlanOutput({ markdown }: { markdown: string }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let active = true;
    if (!markdown) {
      setHtml("");
      return;
    }
    void import("shiki").then(async ({ codeToHtml }) => {
      const highlighted = await codeToHtml(markdown, { lang: "markdown", theme: "github-light" });
      if (active) setHtml(highlighted);
    });
    return () => {
      active = false;
    };
  }, [markdown]);

  if (!markdown) {
    return (
      <div className="grid h-full min-h-64 place-items-center px-8 text-center text-sm text-muted-foreground">
        The Planning Agent result will appear here for review. No project records are changed
        automatically.
      </div>
    );
  }

  return (
    <div
      className="agent-ide-output h-full overflow-auto p-5 text-sm [&_pre]:!bg-transparent [&_pre]:whitespace-pre-wrap [&_pre]:font-mono [&_pre]:leading-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
