/**
 * Read-only support file. Parses a Cache-Control header into lowercase directive names, so
 * "Public, Max-Age=60" and "public, max-age=60" read the same (RFC 9111 §5.2: directive names
 * are case-insensitive). The decision logic lives in shared-cache.ts.
 */
export type Directives = Map<string, string | true>;

export function parseCacheControl(value: string | undefined): Directives {
  const directives: Directives = new Map();
  for (const part of (value ?? "").split(",")) {
    const [rawName, ...rest] = part.split("=");
    const name = rawName.trim().toLowerCase();
    if (!name) continue;
    const arg = rest.join("=").trim().replace(/^"(.*)"$/, "$1");
    directives.set(name, rest.length > 0 ? arg : true);
  }
  return directives;
}

/** A directive's delta-seconds argument (`max-age=60` → 60), or undefined when absent or invalid. */
export function seconds(directives: Directives, name: string): number | undefined {
  const value = directives.get(name);
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  return Number(value);
}

/** Header names are lowercase, the way a `Headers` object normalises them. */
export type CacheRequest = { method: string; headers: Record<string, string> };
export type CacheResponse = { headers: Record<string, string> };

export type Decision =
  | "do-not-store" // a shared cache must not keep this response at all
  | "fresh" // serve the stored copy without contacting the origin
  | "serve-stale-and-refresh" // serve the stale copy now, refresh it in the background
  | "revalidate"; // ask the origin (conditional request) before reusing the copy
