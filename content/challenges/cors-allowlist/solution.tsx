import type { CorsConfig, CorsDecision, IncomingRequest } from "./cors-types";

export function cors(request: IncomingRequest, config: CorsConfig): CorsDecision {
  const origin = request.headers["origin"];

  // The answer depends on Origin for EVERY response — allowed, refused, or no Origin at all — so
  // a cache must never hand one origin's response (or a navigation's) to another origin.
  const headers: Record<string, string> = { vary: "Origin" };

  // Exact string match against full origins. No prefixes, suffixes or regexes: each of those lets
  // in a lookalike such as https://app.example.com.evil.test.
  const allowed = origin !== undefined && config.allowedOrigins.includes(origin);
  if (allowed) {
    // Echo the one matching origin. `*` is refused by browsers for credentialed requests, and the
    // header can't list several origins.
    headers["access-control-allow-origin"] = origin;
    if (config.allowCredentials) headers["access-control-allow-credentials"] = "true";
  }

  const isPreflight =
    request.method === "OPTIONS" && request.headers["access-control-request-method"] !== undefined;
  if (!isPreflight) return { kind: "pass", headers };

  // Refused preflight: no grant headers, and the browser never sends the real request.
  if (!allowed) return { kind: "preflight", status: 403, headers };

  headers["access-control-allow-methods"] = config.allowedMethods.join(", ");
  // Explicit names: with credentials `*` is a literal header called "*", and the Fetch standard
  // never lets `*` cover Authorization anyway.
  headers["access-control-allow-headers"] = config.allowedHeaders.join(", ");
  headers["access-control-max-age"] = String(config.maxAgeSeconds);
  return { kind: "preflight", status: 204, headers };
}
