import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { defineConfig, type Plugin } from "vite";

const root = path.resolve(__dirname, "web");

/**
 * pdf.js needs its CJK character maps and standard fonts as static files or
 * Japanese/Chinese/Korean PDFs render without text. Served from node_modules
 * in dev, copied into the build output in production.
 */
function pdfjsAssets(): Plugin {
  const require = createRequire(import.meta.url);
  const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"));
  let outDir = "dist/client";
  return {
    name: "pdfjs-static-assets",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = (req.url || "").split("?")[0].match(/^\/pdfjs\/(cmaps|standard_fonts)\/([\w.-]+)$/);
        if (!match) return next();
        const file = path.join(pdfjsRoot, match[1], match[2]);
        fs.readFile(file, (error, data) => {
          if (error) {
            res.statusCode = 404;
            return res.end();
          }
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.end(data);
        });
      });
    },
    closeBundle() {
      for (const dir of ["cmaps", "standard_fonts"]) {
        const source = path.join(pdfjsRoot, dir);
        if (fs.existsSync(source)) fs.cpSync(source, path.join(outDir, "pdfjs", dir), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  root,
  plugins: [react(), tailwindcss(), pdfjsAssets()],
  resolve: {
    alias: {
      "@": path.join(root, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
          if (id.includes("react-pdf") || id.includes("pdfjs-dist")) return "vendor-pdf";
          if (id.includes("mermaid") || id.includes("cytoscape") || id.includes("dagre")) return "vendor-mermaid";
          if (id.includes("shiki") || id.includes("@shikijs")) return "vendor-shiki";
          if (id.includes("katex")) return "vendor-katex";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (/react-markdown|remark-|rehype-|micromark|unified|mdast|hast|vfile/.test(id)) return "vendor-markdown";
          return undefined;
        },
      },
    },
  },
});
