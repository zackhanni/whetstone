import type { CacheStore } from "./cache-store";
import type { Product, ProductDb } from "./product-db";

/** How long a cached product may be served before it's reloaded. */
export const PRODUCT_TTL_MS = 60_000;

export class ProductCache {
  /** Loads in progress, by cache key: concurrent misses for one key share one database call. */
  private readonly inFlight = new Map<string, Promise<Product>>();

  constructor(
    private readonly cache: CacheStore,
    private readonly db: ProductDb,
  ) {}

  async getProduct(id: string): Promise<Product> {
    const key = `product:${id}`;
    // cache-manager v7 already turns a failed `get` into `undefined`, a miss. A raw Redis client
    // would throw here instead, and you'd catch it the same way as `set` below.
    const cached = await this.cache.get<Product>(key);
    if (cached !== undefined) return cached;

    // Single-flight: the first miss starts the load; every miss that arrives before it settles
    // awaits the same promise. `finally` removes it whether the load resolved or rejected, so a
    // failure is never remembered — the next read tries the database again.
    let load = this.inFlight.get(key);
    if (!load) {
      load = this.loadAndCache(key, id).finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, load);
    }
    return load;
  }

  async updatePrice(id: string, price: number): Promise<void> {
    await this.db.updatePrice(id, price);
    // Invalidate AFTER the write commits: deleting first lets a concurrent read put the old price
    // straight back. If the cache is down the write has still happened, so don't fail the
    // request — the stale entry is gone within PRODUCT_TTL_MS anyway. (A real service would log
    // this and count it.)
    try {
      await this.cache.del(`product:${id}`);
    } catch {
      // Cache unavailable: tolerated, bounded by the TTL.
    }
  }

  private async loadAndCache(key: string, id: string): Promise<Product> {
    // A failed load rejects right here — before anything is written to the cache.
    const product = await this.db.findProduct(id);
    try {
      await this.cache.set(key, product, PRODUCT_TTL_MS);
    } catch {
      // Cache unavailable: fail open. The database answered, so the caller gets the product;
      // the next read simply misses again.
    }
    return product;
  }
}
