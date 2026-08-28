import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const STANDARD_CHUNK_LIMIT = 510_000;
// Monaco 0.56's editor API is 2.67 MB before gzip. Language support remains split from this lazy core.
const MONACO_CHUNK_LIMIT = 2_800_000;

export default defineConfig({
  build: {
    chunkSizeWarningLimit: MONACO_CHUNK_LIMIT / 1_000,
    emptyOutDir: true,
    outDir: "../../../dist/neot/desktop",
    sourcemap: true
  },
  cacheDir: "../../../node_modules/.vite/neot-desktop",
  clearScreen: false,
  plugins: [react(), desktopBundleBudget()],
  server: {
    host: "127.0.0.1",
    port: 1620,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] }
  }
});

function desktopBundleBudget(): Plugin {
  return {
    name: "neot-desktop-bundle-budget",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        const monaco = Object.keys(output.modules).some((id) => id.includes("/monaco-editor/"));
        const limit = monaco ? MONACO_CHUNK_LIMIT : STANDARD_CHUNK_LIMIT;
        const bytes = new TextEncoder().encode(output.code).byteLength;
        if (bytes > limit) {
          this.error(
            `${output.fileName} is ${formatKilobytes(bytes)} kB. The ${monaco ? "lazy Monaco" : "application"} chunk limit is ${formatKilobytes(limit)} kB.`
          );
        }
      }
    }
  };
}

function formatKilobytes(bytes: number) {
  return Math.round(bytes / 1_000);
}
