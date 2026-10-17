import type { CacheStore } from "./cache-store";
import type { Product, ProductDb } from "./product-db";

/** How long a cached product may be served before it's reloaded. */
export const PRODUCT_TTL_MS = 60_000;

/**
 * Cache-aside for product reads. It works on a quiet afternoon. Four bugs, in the order worth
 * fixing them:
 *   1. TTL — entries are written without one, so a cached product never expires.
 *   2. invalidation — updatePrice changes the database and leaves the old price cached.
 *   3. stampede — ten concurrent reads of an uncached product run ten database loads.
 *   4. outage — with the cache down, `set` rejects, so a read the database already answered fails.
 */
export class ProductCache {
  constructor(
    private readonly cache: CacheStore,
    private readonly db: ProductDb,
  ) {}

  async getProduct(id: string): Promise<Product> {
    const key = `product:${id}`;
    const cached = await this.cache.get<Product>(key);
    if (cached !== undefined) return cached;

    const product = await this.db.findProduct(id);
    await this.cache.set(key, product);
    return product;
  }

  async updatePrice(id: string, price: number): Promise<void> {
    await this.db.updatePrice(id, price);
  }
}
