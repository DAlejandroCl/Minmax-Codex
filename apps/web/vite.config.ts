/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const pkg = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Los paquetes del monorepo se resuelven desde su código fuente: `pnpm dev` no exige compilarlos antes.
  resolve: {
    alias: {
      "@minmax-codex/shared": pkg("shared"),
      "@minmax-codex/optimizer": pkg("optimizer"),
    },
  },
  worker: { format: "es" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    css: false,
  },
});
