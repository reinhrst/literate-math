import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      // Whenever code imports "obsidian", use the mock instead (tests only)
      obsidian: resolve(__dirname, "tests/mocks/obsidian.ts")
    }
  },
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    globals: true,
    passWithNoTests: false
  }
});
