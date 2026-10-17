import {
  ConflictError,
  NotFoundError,
  OutOfStockError,
  type Product,
  type ProductStore,
} from "./product-store";

/**
 * Reserve `quantity` units of a product using optimistic concurrency (the version column).
 *
 * Each attempt is a whole read → decide → write. A write that matches 0 rows means another
 * transaction committed after our read, so the decision we made is stale: throw it away and
 * start the attempt again from a fresh read — including the stock check.
 */
export async function reserveStock(
  store: ProductStore,
  productId: string,
  quantity: number,
  maxAttempts = 3,
): Promise<Product> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const product = await store.read(productId);
    if (!product) throw new NotFoundError(productId);
    if (product.stock < quantity) throw new OutOfStockError(productId, product.stock);

    const next = { ...product, stock: product.stock - quantity, version: product.version + 1 };
    const changed = await store.updateStockIfVersion(productId, product.version, next.stock);
    // 1 row: the version still matched, so `next` is exactly what is now committed.
    if (changed === 1) return next;
    // 0 rows: someone else wrote first — loop round and decide again from fresh data.
  }

  throw new ConflictError(productId, maxAttempts);
}
