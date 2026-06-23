import next from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...next,
  {
    // Lesson content is authored for the in-browser/Vitest runner, not the app build.
    ignores: [".next/**", "node_modules/**", "content/challenges/**"],
  },
];

export default eslintConfig;
