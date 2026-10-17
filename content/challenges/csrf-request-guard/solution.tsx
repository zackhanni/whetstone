/**
 * The CSRF guard every state-changing request to the app passes through, plus the session cookie
 * it protects. The app's pages live on one origin, and every legitimate write comes from them.
 */
export type GuardRequest = {
  method: string;
  /** Header names are lowercase, as Node's IncomingMessage gives them to you. */
  headers: Record<string, string | undefined>;
};

export type GuardResult = { allowed: true } | { allowed: false; reason: string };

/** Safe methods must never change state, so they need no CSRF check (and links keep working). */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function checkCsrf(req: GuardRequest, trustedOrigins: string[]): GuardResult {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return { allowed: true };

  // Fetch Metadata first: the browser sets it, and page script can't change it.
  const site = req.headers["sec-fetch-site"];
  if (site !== undefined) {
    // same-site would trust every sibling subdomain, including any that serve user content.
    if (site === "same-origin") return { allowed: true };
    return { allowed: false, reason: `Sec-Fetch-Site: ${site}` };
  }

  // Older browsers: fall back to Origin, compared exactly. A prefix check accepts
  // https://app.example.com.evil.test, and "null" is never one of ours.
  const origin = req.headers["origin"];
  if (origin !== undefined) {
    if (trustedOrigins.includes(origin)) return { allowed: true };
    return { allowed: false, reason: `untrusted Origin: ${origin}` };
  }

  // Neither header is evidence of nothing. Fail closed.
  return { allowed: false, reason: "no Sec-Fetch-Site or Origin header" };
}

export function sessionCookie(value: string, maxAgeSeconds: number): string {
  // HttpOnly: page script (so an XSS) can't read it. Secure: HTTPS only.
  // SameSite=Lax written out: only Chromium applies Lax when the attribute is missing.
  return `session=${value}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}
