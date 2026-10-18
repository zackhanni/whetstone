/** Marks one blank in a fill-blank prompt's `code`; the schema checks there is one per blank. */
export const BLANK_TOKEN = "___";

/**
 * How a typed fill-blank answer is compared with an `accept` entry. Shared by the app's grader
 * (components/fill-blank-block.tsx) and the schema (learning/schema.ts), which rejects two
 * `accept` entries that normalize to the same string — the second one could never matter.
 *
 * Blanks are mostly code, so formatting the learner can't see in the prompt doesn't count
 * against them: case, every whitespace character, and quote style (' ` ") are ignored.
 * `() =>`, `()=>` and `( ) =>` all match one entry; `"resize"` matches `'resize'`.
 * Kept free of `@/` imports so the tsx-run validator can load it.
 */
export function normalizeBlankAnswer(answer: string): string {
  return answer.replace(/\s+/g, "").replace(/['`]/g, '"').toLowerCase();
}

/** Whether `typed` matches any accepted answer for one blank. */
export function blankMatches(typed: string, accept: readonly string[]): boolean {
  const normalized = normalizeBlankAnswer(typed);
  return normalized !== "" && accept.some((a) => normalizeBlankAnswer(a) === normalized);
}
