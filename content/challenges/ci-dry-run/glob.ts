/**
 * GitHub Actions filter patterns, the subset this challenge needs (from the "Filter pattern cheat
 * sheet" in GitHub's workflow syntax reference):
 *   *     matches zero or more characters, but not "/"
 *   **    matches zero or more of any character, "/" included
 *   **\/  as a path prefix may also match zero directories, so "**\/README.md" matches "README.md"
 * Patterns match the whole value: "docs/*" matches "docs/a.md" but not "docs/a/b.md".
 * Not supported here: ? + [] and !negation.
 *
 * Read-only support file.
 */
export function matchesGlob(value: string, pattern: string): boolean {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char !== "*") {
      source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    } else if (pattern[i + 1] !== "*") {
      source += "[^/]*";
    } else if (pattern[i + 2] === "/") {
      source += "(?:.*/)?";
      i += 2;
    } else {
      source += ".*";
      i += 1;
    }
  }
  return new RegExp(`^${source}$`).test(value);
}

/** True when `value` matches at least one of the patterns. */
export const matchesAny = (value: string, patterns: readonly string[]): boolean =>
  patterns.some((pattern) => matchesGlob(value, pattern));
