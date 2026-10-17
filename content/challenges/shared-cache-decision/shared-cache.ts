import { parseCacheControl, seconds, type CacheRequest, type CacheResponse, type Decision } from "./cache-control";

/**
 * What a shared cache (a CDN) may do with a stored response, `ageSeconds` after the origin
 * produced it. Rules: RFC 9111 (storing, freshness) and RFC 5861 (stale-while-revalidate).
 * This cache reads only Cache-Control and never guesses a lifetime: a stored response without
 * s-maxage or max-age is stale at once.
 *
 * Five bugs, in the order worth fixing them:
 *   1. no-cache  — treated like no-store; it means "store, but check with the origin every time".
 *   2. private   — ignored; a shared cache must never store a private response.
 *   3. Authorization — ignored; a shared cache stores the answer to an authenticated request only
 *      when the response explicitly allows it.
 *   4. s-maxage  — ignored; in a shared cache it replaces max-age as the lifetime.
 *   5. stale-while-revalidate — ignored; inside that window a stale copy may still be served.
 */
export function sharedCacheDecision(
  request: CacheRequest,
  response: CacheResponse,
  ageSeconds: number,
): Decision {
  if (request.method !== "GET" && request.method !== "HEAD") return "do-not-store";

  const cc = parseCacheControl(response.headers["cache-control"]);
  if (cc.has("no-store") || cc.has("no-cache")) return "do-not-store";

  const lifetime = seconds(cc, "max-age") ?? 0;

  if (ageSeconds < lifetime) return "fresh";
  return "revalidate";
}
