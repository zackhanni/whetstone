import { clock } from "./clock";

/**
 * The slice of cache-manager v7's `Cache` (what `@Inject(CACHE_MANAGER)` gives you in Nest 12)
 * that cache-aside needs. TTLs are in MILLISECONDS; a miss is `undefined`.
 */
export interface CacheStore {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<T>;
  del(key: string): Promise<boolean>;
}

/**
 * An in-memory stand-in for a Redis-backed cache. It copies values in and out as JSON, as a
 * shared store does, and it can be taken "down". Down, it behaves the way cache-manager v7 over
 * `@keyv/redis` does when Redis is unreachable: `get` swallows the error and reports a miss,
 * while `set` and `del` reject. (Read-only support file.)
 */
export class FakeCache implements CacheStore {
  down = false;
  private readonly entries = new Map<string, { json: string; expiresAt: number }>();

  async get<T>(key: string): Promise<T | undefined> {
    if (this.down) return undefined;
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (clock.now() >= entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return JSON.parse(entry.json) as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<T> {
    if (this.down) throw new Error("Redis client is not connected");
    // No TTL (or 0) means "never expires" — the same as cache-manager with no default ttl.
    const expiresAt = ttlMs ? clock.now() + ttlMs : Number.POSITIVE_INFINITY;
    this.entries.set(key, { json: JSON.stringify(value), expiresAt });
    return value;
  }

  async del(key: string): Promise<boolean> {
    if (this.down) throw new Error("Redis client is not connected");
    this.entries.delete(key);
    return true;
  }
}
