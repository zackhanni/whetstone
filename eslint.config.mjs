import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Loose guardrail: nested ternaries are hard to read — prefer an early return, if/else,
      // or a computed variable. Warns (doesn't fail `pnpm lint`). See AGENTS.md → Patterns to avoid.
      "no-nested-ternary": "warn",
    },
  },
  {
    // Lesson content is authored for the in-browser/Vitest runner, not the app build.
    ignores: [".next/**", "node_modules/**", "content/challenges/**"],
  },
];

export default eslintConfig;
