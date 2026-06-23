import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // Lesson content is authored for the in-browser/Vitest runner, not the app build.
    ignores: [".next/**", "node_modules/**", "content/challenges/**"],
  },
];

export default eslintConfig;
