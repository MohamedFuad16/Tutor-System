import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react() as never],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.dom.tsx"],
    include: ["tests/**/*.test.tsx"],
    restoreMocks: true,
    clearMocks: true,
    fileParallelism: false,
  },
});
