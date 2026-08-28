import js from "@eslint/js";
import { registerHooks } from "node:module";

// TypeScript 7 uses the native compiler and no longer exposes the legacy
// compiler API consumed by typescript-eslint 8. Keep lint parsing on the
// latest TypeScript 6 compiler until typescript-eslint supports TypeScript 7.
const eslintCompilerUrl = import.meta.resolve("typescript-eslint-compiler");
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "typescript") {
      return { shortCircuit: true, url: eslintCompilerUrl };
    }

    return nextResolve(specifier, context);
  }
});

const [{ default: tsParser }, { default: tsPlugin }] = await Promise.all([
  import("@typescript-eslint/parser"),
  import("@typescript-eslint/eslint-plugin")
]);

export default [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", ".turbo/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        AbortSignal: "readonly",
        Buffer: "readonly",
        console: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly"
      }
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ]
    }
  }
];
