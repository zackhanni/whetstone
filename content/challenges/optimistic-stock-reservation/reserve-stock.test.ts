import { reserveStock } from "./reserve-stock";
import { ProductStore } from "./product-store";

const pen = (stock: number) => new ProductStore([{ id: "pen", stock, version: 1 }]);

/** Resolves to the error's name, or "resolved" if the promise didn't reject. */
async function outcome(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "resolved";
  } catch (err) {
    return err instanceof Error ? err.name : String(err);
  }
}

describe("reserveStock", () => {
  it("reserves stock and returns the stored row when nobody else writes", async () => {
    const store = pen(10);
    const result = await reserveStock(store, "pen", 2);
    expect(result.stock).toBe(8);
    expect(result.version).toBe(2);
    expect(store.peek("pen")?.stock).toBe(8);
  });

  it("reserves exactly the remaining stock", async () => {
    const store = pen(2);
    const result = await reserveStock(store, "pen", 2);
    expect(result.stock).toBe(0);
    expect(store.peek("pen")?.stock).toBe(0);
  });

  it("rejects with OutOfStockError and never writes when stock is short at the first read", async () => {
    const store = pen(1);
    expect(await outcome(reserveStock(store, "pen", 2))).toBe("OutOfStockError");
    expect(store.writeAttempts).toBe(0);
  });

  it("treats a write that matched 0 rows as a conflict, not a success", async () => {
    const store = pen(10);
    store.otherWriterCommitsBeforeNextWrite("pen", 7);
    // With a single attempt allowed, the one conflicting write must end in ConflictError.
    expect(await outcome(reserveStock(store, "pen", 2, 1))).toBe("ConflictError");
    expect(store.peek("pen")?.stock).toBe(7);
  });

  it("re-reads and retries after another writer commits first, keeping both writes", async () => {
    const store = pen(10);
    store.otherWriterCommitsBeforeNextWrite("pen", 7); // they sold 3 after our read
    const result = await reserveStock(store, "pen", 2);
    expect(store.peek("pen")?.stock).toBe(5);
    expect(result.stock).toBe(5);
    expect(result.version).toBe(store.peek("pen")?.version);
  });

  it("re-checks stock on the retry and refuses to oversell", async () => {
    const store = pen(3);
    store.otherWriterCommitsBeforeNextWrite("pen", 1); // they took 2 of the 3 after our read
    expect(await outcome(reserveStock(store, "pen", 2))).toBe("OutOfStockError");
    expect(store.peek("pen")?.stock).toBe(1);
  });

  it("gives up with ConflictError after exactly maxAttempts conflicting writes", async () => {
    const store = pen(10);
    store.otherWriterCommitsBeforeEveryWrite();
    expect(await outcome(reserveStock(store, "pen", 2, 3))).toBe("ConflictError");
    expect(store.writeAttempts).toBe(3);
  });
});
