/**
 * Splits a Content-Security-Policy header into its directives, following the CSP Level 3
 * "parse a serialized CSP" steps: split on ";", trim, lowercase the directive name, ignore a
 * repeated directive (the first one wins), and split the rest on whitespace.
 *
 * Read-only support file: the grader uses it, and the preview does too.
 */
export function parseCsp(header: string): Record<string, string[]> {
  const directives: Record<string, string[]> = {};
  for (const token of header.split(";")) {
    const [name, ...values] = token.trim().split(/\s+/).filter(Boolean);
    if (!name) continue;
    const key = name.toLowerCase();
    if (key in directives) continue;
    directives[key] = values;
  }
  return directives;
}
