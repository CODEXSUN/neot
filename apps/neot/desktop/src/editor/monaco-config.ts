import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import EditorWorker from "monaco-editor/editor/editor.worker?worker";
import CssWorker from "monaco-editor/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker?worker";
import JsonWorker from "monaco-editor/language/json/json.worker?worker";
import TypeScriptWorker from "monaco-editor/language/typescript/ts.worker?worker";

type MonacoWorker = new () => Worker;

const workers: Record<string, MonacoWorker> = {
  css: CssWorker,
  handlebars: HtmlWorker,
  html: HtmlWorker,
  javascript: TypeScriptWorker,
  json: JsonWorker,
  less: CssWorker,
  scss: CssWorker,
  typescript: TypeScriptWorker
};

const workerHost = self as typeof self & {
  MonacoEnvironment?: { getWorker: (_moduleId: string, label: string) => Worker };
};

workerHost.MonacoEnvironment = {
  getWorker: (_moduleId, label) => {
    const WorkerConstructor = workers[label] ?? EditorWorker;
    return new WorkerConstructor();
  }
};

loader.config({ monaco });

let languageLoad: Promise<void> | undefined;

export function loadMonacoLanguages() {
  languageLoad ??= Promise.all([
    import("monaco-editor/basic-languages/monaco.contribution"),
    import("monaco-editor/language/css/monaco.contribution"),
    import("monaco-editor/language/html/monaco.contribution"),
    import("monaco-editor/language/json/monaco.contribution"),
    import("monaco-editor/language/typescript/monaco.contribution")
  ]).then(() => undefined);
  return languageLoad;
}
