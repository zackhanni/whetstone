/**
 * Builds the Content-Security-Policy for one HTML response. The app's proxy calls
 * cspForRequest() for every page request, sends `header` as the Content-Security-Policy response
 * header, and puts `nonce` on the page's own <script> tags.
 *
 * Four bugs, in the order worth fixing them:
 *   1. script-src lets every inline script run, not just the page's own.
 *   2. Every response gets the same nonce.
 *   3. Plugins and the <base> element are left unrestricted.
 *   4. A development-only allowance is sent in production too.
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

const nonce = createNonce();

export function cspForRequest(options: CspOptions): CspForRequest {
  const scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...options.scriptOrigins];

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    // Inline styles stay allowed: a separate trade-off, out of scope here.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    `connect-src ${["'self'", ...options.connectOrigins].join(" ")}`,
    "frame-ancestors 'none'",
  ];
  if (options.reportTo) directives.push(`report-to ${options.reportTo}`);

  return { nonce, header: directives.join("; ") };
}
