import { parseCacheControl, seconds, type CacheRequest, type CacheResponse, type Decision } from "./cache-control";

/**
 * What a shared cache (a CDN) may do with a stored response, `ageSeconds` after the origin
 * produced it. Rules: RFC 9111 (storing, freshness) and RFC 5861 (stale-while-revalidate).
 * This cache reads only Cache-Control and never guesses a lifetime: a stored response without
 * s-maxage or max-age is stale at once.
 */
export function sharedCacheDecision(
  request: CacheRequest,
  response: CacheResponse,
  ageSeconds: number,
): Decision {
  if (request.method !== "GET" && request.method !== "HEAD") return "do-not-store";

  const cc = parseCacheControl(response.headers["cache-control"]);

  // RFC 9111 §3: never store no-store; a SHARED cache never stores private.
  if (cc.has("no-store") || cc.has("private")) return "do-not-store";

  // §3.5: the answer to an authenticated request may be shared only if the response opts in.
  const optsIntoSharing = cc.has("public") || cc.has("s-maxage") || cc.has("must-revalidate");
  if (request.headers["authorization"] !== undefined && !optsIntoSharing) return "do-not-store";

  // no-cache: stored, but no reuse without validation, however young the copy is.
  if (cc.has("no-cache")) return "revalidate";

  // §4.2.1: in a shared cache s-maxage wins over max-age. With neither, this cache (which never
  // guesses a heuristic lifetime) treats the stored copy as stale at once.
  const lifetime = seconds(cc, "s-maxage") ?? seconds(cc, "max-age") ?? 0;
  if (ageSeconds < lifetime) return "fresh";

  // Stale. RFC 5861 lets a cache keep serving it for N more seconds while it refreshes,
  // unless must-revalidate forbids serving stale at all (§5.2.2.2). Read literally, §5.2.2.10
  // gives s-maxage the same no-stale rule in a shared cache; Vercel's CDN docs (and Next's own
  // `s-maxage=…, stale-while-revalidate=…` header) treat stale-while-revalidate as the explicit
  // permission that overrides it, and so does this cache.
  const swr = seconds(cc, "stale-while-revalidate");
  if (swr !== undefined && !cc.has("must-revalidate") && ageSeconds < lifetime + swr) {
    return "serve-stale-and-refresh";
  }
  return "revalidate";
}
