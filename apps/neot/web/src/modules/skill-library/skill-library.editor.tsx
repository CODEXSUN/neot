import Editor from "@monaco-editor/react";

export function SkillEditor({ file, onChange, value }: { file: string; onChange: (value: string) => void; value: string }) {
  return (
    <Editor
      height="100%"
      language={language(file)}
      onChange={(next) => onChange(next ?? "")}
      options={{
        fontFamily: "Geist Mono, ui-monospace, monospace",
        fontSize: 13,
        lineHeight: 21,
        minimap: { enabled: false },
        padding: { bottom: 18, top: 18 },
        scrollBeyondLastLine: false,
        wordWrap: file.endsWith(".md") ? "on" : "off"
      }}
      path={file}
      theme="vs-light"
      value={value}
    />
  );
}

function language(file: string) {
  if (file.endsWith(".json")) return "json";
  if (file.endsWith(".ts") || file.endsWith(".tsx")) return "typescript";
  if (file.endsWith(".js") || file.endsWith(".jsx")) return "javascript";
  if (file.endsWith(".py")) return "python";
  if (file.endsWith(".yaml") || file.endsWith(".yml")) return "yaml";
  return file.endsWith(".md") ? "markdown" : "plaintext";
}
