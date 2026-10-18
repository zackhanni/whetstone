/**
 * What an in-browser (Sandpack) challenge can import, in one place. Three readers depend on it
 * agreeing: the runner (`components/challenge-runner.tsx`) installs these into the iframe, the
 * validator (`learning/validate-content.ts`) rejects any other bare import, and the headless
 * grader (`scripts/check-challenges.ts`) runs the same tests against the same versions from
 * `node_modules` — so `package.json` must list every pinned package below as a devDependency at
 * the identical version (`pnpm validate` checks that too).
 *
 * Kept free of `@/` imports so the tsx-run scripts can load it as well as the app.
 */

/**
 * Supplied by Sandpack's `react-ts` template itself (currently React 19). The template owns
 * these versions, so they are not pinned here; the headless grader uses the app's own React.
 */
export const TEMPLATE_PACKAGES = ["react", "react-dom"] as const;

/**
 * Added by the runner to every challenge, pinned exactly. A floating range would let a
 * challenge that passes today start failing when the package ships a breaking release.
 */
export const RUNNER_DEPENDENCIES: Readonly<Record<string, string>> = {
  "@testing-library/react": "16.1.0",
  "@testing-library/dom": "10.4.0",
};

/** Every package any challenge may import without declaring it in its meta.json. */
export const SANDBOX_PACKAGES: ReadonlySet<string> = new Set([
  ...TEMPLATE_PACKAGES,
  ...Object.keys(RUNNER_DEPENDENCIES),
]);
