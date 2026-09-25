import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "web/src"),
  "@shared": path.resolve(__dirname, "shared"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "server",
          environment: "node",
          include: ["test/server/**/*.test.ts", "test/shared/**/*.test.ts"],
          testTimeout: 20_000,
        },
      },
      {
        plugins: [react() as never],
        resolve: { alias },
        test: {
          name: "web",
          environment: "jsdom",
          include: ["test/web/**/*.test.tsx"],
          setupFiles: ["test/web/setup.ts"],
        },
      },
    ],
  },
});
