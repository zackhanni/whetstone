import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Mirror the tsconfig `@/*` -> project-root alias so tests can import app modules the same way
// source does. Kept manual (rather than a tsconfig-paths plugin) to avoid an extra dependency.
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": root } },
  test: {
    environment: "node", // lib/* logic is pure; no DOM needed
    include: ["lib/**/*.test.ts", "learning/**/*.test.ts"],
  },
});
