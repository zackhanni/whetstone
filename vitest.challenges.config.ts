import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vitest/config";

/**
 * Runs every challenge grader headlessly, the way Sandpack runs it: jest-style globals, a DOM,
 * real timers, and Testing Library at the versions pinned in learning/sandbox.ts. Driven by
 * scripts/check-challenges.ts (`pnpm test:challenges`), which runs this config twice —
 * CHALLENGE_VARIANT=starter, then CHALLENGE_VARIANT=solution — and checks that the starter fails
 * and the solution passes (PLAYBOOK Rule 4). Not part of `pnpm test`, whose config only covers
 * lib/** and learning/**.
 */
const root = fileURLToPath(new URL(".", import.meta.url));
const challengesDir = path.join(root, "content", "challenges");

/**
 * Serve each challenge's solution.tsx in place of its entry file — what "Show solution" does in
 * the runner. The module keeps the entry's path, so the solution's relative imports resolve
 * exactly as they do in the sandbox (even for a nested entry).
 */
function swapInSolutions(): Plugin {
  const solutionFor = new Map<string, string>();
  for (const slug of readdirSync(challengesDir)) {
    const dir = path.join(challengesDir, slug);
    const metaPath = path.join(dir, "meta.json");
    const solutionPath = path.join(dir, "solution.tsx");
    // A folder missing either file is reported by `pnpm validate`; here it just isn't swapped.
    if (!existsSync(metaPath) || !existsSync(solutionPath)) continue;
    const { entry } = JSON.parse(readFileSync(metaPath, "utf8")) as { entry: string };
    solutionFor.set(path.resolve(dir, entry), solutionPath);
  }
  return {
    name: "whetstone:swap-in-solutions",
    enforce: "pre",
    load(id) {
      const solutionPath = solutionFor.get(id.split("?")[0]);
      return solutionPath ? readFileSync(solutionPath, "utf8") : null;
    },
  };
}

export default defineConfig({
  plugins: process.env.CHALLENGE_VARIANT === "solution" ? [swapInSolutions()] : [],
  test: {
    globals: true, // Sandpack's runner exposes describe/it/expect as globals, not imports
    environment: "happy-dom",
    include: ["content/challenges/**/*.test.{ts,tsx}"],
    testTimeout: 10_000, // graders wait on real timers (see the debounce challenge)
  },
});
