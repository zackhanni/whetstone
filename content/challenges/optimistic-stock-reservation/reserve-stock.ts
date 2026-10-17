import { NotFoundError, OutOfStockError, type Product, type ProductStore } from "./product-store";

/**
 * Reserve `quantity` units of a product using optimistic concurrency (the version column).
 *
 * It works when nobody else is writing. Make it correct with concurrent writers, in this order:
 *   1. updateStockIfVersion resolves to a row count. 0 means another writer committed first —
 *      never report a write that didn't happen as a success.
 *   2. On a conflict, start the attempt over: re-read the row, then write with the fresh version.
 *   3. Re-check the stock on every attempt — the other writer may have taken it.
 *   4. Stop after `maxAttempts` conflicting writes and throw a ConflictError.
 */
export async function reserveStock(
  store: ProductStore,
  productId: string,
  quantity: number,
  maxAttempts = 3,
): Promise<Product> {
  const product = await store.read(productId);
  if (!product) throw new NotFoundError(productId);
  if (product.stock < quantity) throw new OutOfStockError(productId, product.stock);

  await store.updateStockIfVersion(productId, product.version, product.stock - quantity);
  return { ...product, stock: product.stock - quantity, version: product.version + 1 };
}
