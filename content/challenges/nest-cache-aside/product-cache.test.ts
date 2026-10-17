import { ProductCache, PRODUCT_TTL_MS } from "./product-cache";
import { FakeCache } from "./cache-store";
import { FakeProductDb } from "./product-db";
import { clock } from "./clock";

function setup() {
  clock.reset();
  const cache = new FakeCache();
  const db = new FakeProductDb();
  return { cache, db, products: new ProductCache(cache, db) };
}

describe("ProductCache", () => {
  it("serves a second read from the cache", async () => {
    const { db, products } = setup();
    const first = await products.getProduct("p1");
    const second = await products.getProduct("p1");
    expect(second.price).toBe(first.price);
    expect(db.loads).toBe(1);
  });

  it("keeps an entry for PRODUCT_TTL_MS, then reloads it", async () => {
    const { db, products } = setup();
    await products.getProduct("p1");

    clock.advance(PRODUCT_TTL_MS - 1);
    await products.getProduct("p1");
    expect(db.loads).toBe(1); // still fresh just before the TTL (a TTL in seconds fails here)

    clock.advance(2);
    await products.getProduct("p1");
    expect(db.loads).toBe(2); // expired, so it went back to the database
  });

  it("returns the new price on the next read after updatePrice", async () => {
    const { products } = setup();
    await products.getProduct("p1");
    await products.updatePrice("p1", 999);
    const after = await products.getProduct("p1");
    expect(after.price).toBe(999);
  });

  it("doesn't let a read during the price write put the old price back", async () => {
    const { db, products } = setup();
    await products.getProduct("p1");
    // A read arrives while the UPDATE is in flight: it runs just before the row changes.
    const write = db.updatePrice.bind(db);
    db.updatePrice = async (id, price) => {
      await products.getProduct("p1");
      await write(id, price);
    };
    await products.updatePrice("p1", 999);
    const after = await products.getProduct("p1");
    expect(after.price).toBe(999); // invalidating BEFORE the write lets that read re-cache 1299
  });

  it("runs one database load for ten concurrent reads of an uncached product", async () => {
    const { db, products } = setup();
    const results = await Promise.all(Array.from({ length: 10 }, () => products.getProduct("p2")));
    expect(db.loads).toBe(1);
    expect(results.every((p) => p.price === 899)).toBe(true);
  });

  it("doesn't cache a failed load: the error reaches the caller and the next read retries", async () => {
    const { db, products } = setup();
    db.failNextLoad();
    let error: unknown = null;
    try {
      await products.getProduct("p1");
    } catch (e) {
      error = e;
    }
    expect(error instanceof Error).toBe(true);

    const product = await products.getProduct("p1");
    expect(product.price).toBe(1299);
    expect(db.loads).toBe(2);
  });

  it("answers reads from the database while the cache is down", async () => {
    const { cache, db, products } = setup();
    cache.down = true;
    const product = await products.getProduct("p1");
    expect(product.price).toBe(1299);
    expect(db.loads).toBe(1);
  });

  it("still updates the price while the cache is down", async () => {
    const { cache, products } = setup();
    await products.getProduct("p1");
    cache.down = true;
    await products.updatePrice("p1", 500);
    cache.down = false;
    // The entry couldn't be deleted, so it may serve the old price until the TTL runs out...
    clock.advance(PRODUCT_TTL_MS + 1);
    // ...and after that the database's new price comes through.
    const after = await products.getProduct("p1");
    expect(after.price).toBe(500);
  });
});
