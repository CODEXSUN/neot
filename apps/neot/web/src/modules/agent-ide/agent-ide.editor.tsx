import Editor from "@monaco-editor/react";

export function AgentBriefEditor({
  onChange,
  value
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Editor
      beforeMount={(monaco) => {
        monaco.editor.defineTheme("neot", {
          base: "vs",
          colors: { "editor.background": "#fbfcfd", "editorLineNumber.foreground": "#94a3b8" },
          inherit: true,
          rules: []
        });
      }}
      height="100%"
      language="markdown"
      onChange={(next) => onChange(next ?? "")}
      options={{
        folding: true,
        fontFamily: "Geist Mono, ui-monospace, monospace",
        fontSize: 13,
        lineHeight: 21,
        minimap: { enabled: false },
        padding: { bottom: 18, top: 18 },
        scrollBeyondLastLine: false,
        wordWrap: "on"
      }}
      theme="neot"
      value={value}
    />
  );
}
