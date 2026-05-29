import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

const deferredPreloadChunks = [
  /vendor-mermaid/,
  /vendor-pdf/,
  /vendor-charts/,
  /vendor-shiki/,
];

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(process.cwd(), "./src"),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== "true",
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === "true" ? null : {},
    },
    build: {
      chunkSizeWarningLimit: 3000,
      modulePreload: {
        resolveDependencies: (_filename, deps) =>
          deps.filter(
            (dependency) =>
              !deferredPreloadChunks.some((pattern) =>
                pattern.test(dependency),
              ),
          ),
      },
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return undefined;
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("/scheduler/")
            ) {
              return "vendor-react";
            }
            if (id.includes("react-pdf") || id.includes("pdfjs-dist")) {
              return "vendor-pdf";
            }
            if (id.includes("mermaid")) return "vendor-mermaid";
            if (id.includes("shiki") || id.includes("@shikijs")) {
              return "vendor-shiki";
            }
            if (
              id.includes("react-markdown") ||
              id.includes("remark-") ||
              id.includes("micromark") ||
              id.includes("unified") ||
              id.includes("mdast") ||
              id.includes("hast") ||
              id.includes("vfile")
            ) {
              return "vendor-markdown";
            }
            if (id.includes("motion")) return "vendor-motion";
            if (id.includes("dexie")) return "vendor-dexie";
            if (id.includes("recharts") || id.includes("/d3")) {
              return "vendor-charts";
            }
            return undefined;
          },
        },
      },
    },
  };
});
