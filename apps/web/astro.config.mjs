import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Astro + islas React (ADR-004, condicionado a SP-6). La calculadora es una isla hidratada en el cliente.
export default defineConfig({
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
