import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { parse } from "dotenv";
import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { requireEnvNumber, requireEnvValue } from "@neot/framework/env";
import remarkGfm from "remark-gfm";

const configDir = fileURLToPath(new URL(".", import.meta.url));
const repositoryDir = resolve(configDir, "../../..");
const platformSourceRoots = [
  repositoryDir,
  resolve(repositoryDir, "packages/framework"),
  resolve(repositoryDir, "packages/ui"),
  resolve(repositoryDir, "apps/neot/web")
];
const rootPackage = JSON.parse(readFileSync(resolve(repositoryDir, "package.json"), "utf8")) as {
  version: string;
};

export default defineConfig(({ command, mode }) => {
  const runtimeEnv = {
    ...readRuntimeEnv(mode),
    ...process.env
  };

  return {
    build: {
      emptyOutDir: true,
      outDir: "../../../dist/platform/web",
      reportCompressedSize: false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "react-vendor",
                priority: 100,
                test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/
              },
              {
                name: "query-vendor",
                priority: 90,
                test: /node_modules[\\/]@tanstack[\\/]/
              },
              {
                name: "radix-vendor",
                priority: 80,
                test: /node_modules[\\/]@radix-ui[\\/]/
              },
              {
                name: "icons-vendor",
                priority: 70,
                test: /node_modules[\\/]lucide-react[\\/]/
              },
              {
                name: "motion-vendor",
                priority: 60,
                test: /node_modules[\\/]framer-motion[\\/]/
              },
              {
                name: "canvas-vendor",
                priority: 50,
                test: /node_modules[\\/]html2canvas[\\/]/
              },
              {
                name: "jspdf-vendor",
                priority: 40,
                test: /node_modules[\\/]jspdf[\\/]/
              },
              {
                name: "vector-vendor",
                priority: 39,
                test: /node_modules[\\/]canvg[\\/]/
              },
              {
                name: "pdf-support-vendor",
                priority: 38,
                test: /node_modules[\\/](?:dompurify|fast-png|fflate|pdfjs-dist)[\\/]/
              },
              {
                name: "editor-vendor",
                priority: 30,
                test: /node_modules[\\/](?:@tiptap|highlight\.js|lowlight|prosemirror-)[\\/]/
              },
              {
                name: "chart-vendor",
                priority: 20,
                test: /node_modules[\\/](?:d3-|recharts|victory-vendor)[\\/]/
              },
              {
                name: "schema-vendor",
                priority: 10,
                test: /node_modules[\\/](?:date-fns|zod)[\\/]/
              }
            ]
          }
        }
      }
    },
    cacheDir: "../../../node_modules/.vite/platform-web",
    envDir: "../../..",
    optimizeDeps: {
      entries: ["src/main.tsx"],
      include: [
        "@dnd-kit/core",
        "@dnd-kit/modifiers",
        "@dnd-kit/sortable",
        "@dnd-kit/utilities",
        "@tanstack/react-query",
        "@tanstack/react-router",
        "@tanstack/react-table",
        "@excalidraw/excalidraw",
        "date-fns",
        "framer-motion",
        "lucide-react",
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-dev-runtime",
        "react/jsx-runtime",
        "recharts",
        "zod"
      ]
    },
    define: {
      __APP_VERSION__: JSON.stringify(rootPackage.version),
      "import.meta.env.VITE_DEV_AUTO_LOGIN": JSON.stringify(runtimeEnv.DEV_AUTO_LOGIN ?? "0"),
      "import.meta.env.VITE_PLATFORM_API_URL": JSON.stringify("/api/platform")
    },
    plugins: [
      reactRefreshPreamble(),
      mdx({ providerImportSource: "@mdx-js/react", remarkPlugins: [remarkGfm] }),
      tailwindcss(),
      react()
    ],
    resolve: {
      dedupe: ["@tanstack/react-query", "react", "react-dom"]
    },
    ...(command === "serve"
      ? {
          server: {
            allowedHosts: ["neot.test", "localhost", "127.0.0.1"],
            fs: {
              allow: platformSourceRoots
            },
            headers: {
              "Permissions-Policy": "unload=*"
            },
            host: "127.0.0.1",
            port: requireEnvNumber(runtimeEnv.PLATFORM_WEB_PORT, "PLATFORM_WEB_PORT"),
            warmup: {
              clientFiles: [
                "./src/main.tsx",
                "./src/app/PlatformWebApp.tsx",
                "./src/app/router.tsx",
                "./src/public/login/LoginPage.tsx"
              ]
            },
            proxy: {
              "/api/platform": {
                changeOrigin: false,
                rewrite: (path) => path.replace(/^\/api\/platform/u, "") || "/",
                target: platformApiTarget(runtimeEnv)
              }
            }
          }
        }
      : {})
  };
});

function reactRefreshPreamble() {
  return {
    apply: "serve" as const,
    name: "neot:react-refresh-preamble",
    transformIndexHtml: {
      handler: () => [
        {
          attrs: { type: "module" },
          children: `import { injectIntoGlobalHook } from "/@react-refresh";
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;`,
          tag: "script"
        }
      ],
      order: "pre" as const
    }
  };
}

function readRuntimeEnv(mode: string) {
  return [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`].reduce<
    Record<string, string>
  >((values, file) => {
    try {
      return { ...values, ...parse(readFileSync(resolve(repositoryDir, file), "utf8")) };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return values;
    }
  }, {});
}

function platformApiTarget(runtimeEnv: Record<string, string | undefined>) {
  return requireEnvValue(runtimeEnv.PLATFORM_API_URL, "PLATFORM_API_URL");
}
