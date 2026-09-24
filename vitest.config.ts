import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@taskmate/shared": path.resolve(__dirname, "./packages/shared/src/index.ts"),
      "@taskmate/db": path.resolve(__dirname, "./packages/db/src/index.ts"),
      "@taskmate/tools": path.resolve(__dirname, "./packages/tools/src/index.ts"),
      "@taskmate/agent": path.resolve(__dirname, "./packages/agent/src/index.ts"),
      "@taskmate/ui": path.resolve(__dirname, "./packages/ui/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
  },
});
