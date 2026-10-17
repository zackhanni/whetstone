import { validateContent } from "../learning/validate-content";

/** `pnpm validate` — prints learning/validate-content.ts's report and fails on any error. */
async function main() {
  const { lines, errors, warnings } = await validateContent(process.cwd());
  for (const { kind, text } of lines) {
    if (kind === "error") console.error("  ✗", text);
    else if (kind === "warning") console.warn("  ⚠", text);
    else console.log(text);
  }
  const summary = errors.length ? `\n${errors.length} problem(s) found` : "\nAll content valid ✅";
  console.log(warnings.length ? `${summary} — ${warnings.length} warning(s)` : summary);
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
