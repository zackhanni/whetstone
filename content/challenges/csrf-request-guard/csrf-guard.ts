/**
 * The CSRF guard every state-changing request to the app passes through, plus the session cookie
 * it protects. The app's pages live on one origin, and every legitimate write comes from them.
 *
 * Five bugs, in the order worth fixing them:
 *   1. Only POST is checked; other state-changing methods walk straight through.
 *   2. Origin is compared by prefix.
 *   3. Sec-Fetch-Site: same-site is trusted.
 *   4. A request carrying neither header is let through.
 *   5. sessionCookie leaves its protection to whatever each browser does by default.
 */
export type GuardRequest = {
  method: string;
  /** Header names are lowercase, as Node's IncomingMessage gives them to you. */
  headers: Record<string, string | undefined>;
};

export type GuardResult = { allowed: true } | { allowed: false; reason: string };

export function checkCsrf(req: GuardRequest, trustedOrigins: string[]): GuardResult {
  if (req.method !== "POST") return { allowed: true };

  const site = req.headers["sec-fetch-site"];
  if (site !== undefined) {
    if (site === "same-origin" || site === "same-site") return { allowed: true };
    return { allowed: false, reason: `Sec-Fetch-Site: ${site}` };
  }

  const origin = req.headers["origin"];
  if (origin !== undefined) {
    if (trustedOrigins.some((trusted) => origin.startsWith(trusted))) return { allowed: true };
    return { allowed: false, reason: `untrusted Origin: ${origin}` };
  }

  return { allowed: true };
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
  return `session=${value}; Path=/; Max-Age=${maxAgeSeconds}`;
}
