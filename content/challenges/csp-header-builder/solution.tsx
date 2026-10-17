/**
 * Builds the Content-Security-Policy for one HTML response. The app's proxy calls
 * cspForRequest() for every page request, sends `header` as the Content-Security-Policy response
 * header, and puts `nonce` on the page's own <script> tags.
 */
export type CspOptions = {
  /** Origins allowed to serve scripts besides our own, e.g. "https://js.stripe.com". */
  scriptOrigins: string[];
  /** Origins that fetch/XHR/WebSocket may reach besides our own. */
  connectOrigins: string[];
  /** The name of an endpoint declared in the Reporting-Endpoints header, if any. */
  reportTo?: string;
  /** True under `next dev`: React's development build uses eval for debugging information. */
  dev: boolean;
};

export type CspForRequest = { nonce: string; header: string };

/** 128 bits from the platform's cryptographically secure generator, base64-encoded. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
}

export function cspForRequest(options: CspOptions): CspForRequest {
  // A nonce is a per-response secret. Generated once per process, it would be printed in every
  // page anyone loads, attacker included, and they'd just copy it onto their injected script.
  const nonce = createNonce();

  // Only inline scripts carrying this response's nonce run; injected ones don't have it.
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, ...options.scriptOrigins];
  // React's development build needs eval; production must not allow it (a nonce doesn't
  // neutralise 'unsafe-eval' the way it neutralises 'unsafe-inline').
  if (options.dev) scriptSrc.push("'unsafe-eval'");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Inline styles stay allowed: a separate trade-off, out of scope here.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src ${["'self'", ...options.connectOrigins].join(" ")}`,
    // No <object>/<embed>: plugin content is an old route around script rules.
    "object-src 'none'",
    // base-uri doesn't fall back to default-src. Without it, an injected
    // <base href="https://evil.example"> re-points our nonced relative script URLs.
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ];
  if (options.reportTo) directives.push(`report-to ${options.reportTo}`);

  return { nonce, header: directives.join("; ") };
}
