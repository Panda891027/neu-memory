import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Include test files from any location
    include: ["*.test.ts", "tests/**/*.test.ts"],
    // Exclude common directories
    exclude: ["**/node_modules/**", "**/.git/**"],
  },
});
