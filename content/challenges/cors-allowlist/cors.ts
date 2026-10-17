import type { CorsConfig, CorsDecision, IncomingRequest } from "./cors-types";

/**
 * Decides the CORS headers for one request. Four bugs, in the order worth fixing them:
 *   1. the allow-list is a prefix match, so lookalike origins get in
 *   2. an allowed origin is answered with `*`, which browsers refuse when credentials are involved
 *   3. nothing tells caches that the response depends on the Origin header
 *   4. the preflight grants headers with `*`, which means nothing with credentials
 */
export function cors(request: IncomingRequest, config: CorsConfig): CorsDecision {
  const origin = request.headers["origin"];
  const headers: Record<string, string> = {};

  const allowed = origin !== undefined && config.allowedOrigins.some((o) => origin.startsWith(o));
  if (allowed) {
    headers["access-control-allow-origin"] = "*";
    if (config.allowCredentials) headers["access-control-allow-credentials"] = "true";
  }

  const isPreflight =
    request.method === "OPTIONS" && request.headers["access-control-request-method"] !== undefined;
  if (!isPreflight) return { kind: "pass", headers };

  if (!allowed) return { kind: "preflight", status: 403, headers };

  headers["access-control-allow-methods"] = config.allowedMethods.join(", ");
  headers["access-control-allow-headers"] = "*";
  headers["access-control-max-age"] = String(config.maxAgeSeconds);
  return { kind: "preflight", status: 204, headers };
}
