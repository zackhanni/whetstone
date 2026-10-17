/**
 * An in-memory stand-in for a PostgreSQL `products` table with a version column. Each method is
 * one SQL statement (shown above it). The "other writer" helpers at the bottom simulate a
 * concurrent transaction committing between your read and your write.
 *
 * Read-only support file — your code goes in reserve-stock.ts.
 */
export type Product = { id: string; stock: number; version: number };

export class NotFoundError extends Error {
  constructor(readonly productId: string) {
    super(`no product ${productId}`);
    this.name = "NotFoundError";
  }
}

export class OutOfStockError extends Error {
  constructor(
    readonly productId: string,
    readonly available: number,
  ) {
    super(`not enough stock for ${productId}: ${available} left`);
    this.name = "OutOfStockError";
  }
}

export class ConflictError extends Error {
  constructor(
    readonly productId: string,
    readonly attempts: number,
  ) {
    super(`gave up on ${productId} after ${attempts} conflicting writes`);
    this.name = "ConflictError";
  }
}

// A real database would let a retry loop without a limit spin forever. This one stops it, so a
// missing limit shows up as a failing test instead of a frozen tab.
const RUNAWAY_LIMIT = 50;

export class ProductStore {
  private rows = new Map<string, Product>();
  private otherWritesBeforeNextWrite: Array<{ id: string; stock: number }> = [];
  private otherWriterBeforeEveryWrite = false;
  reads = 0;
  writeAttempts = 0;

  constructor(seed: Product[]) {
    for (const p of seed) this.rows.set(p.id, { ...p });
  }

  /** SELECT id, stock, version FROM products WHERE id = $1 */
  async read(id: string): Promise<Product | null> {
    this.reads += 1;
    if (this.reads > RUNAWAY_LIMIT) throw new Error(`runaway loop: ${RUNAWAY_LIMIT} reads`);
    await Promise.resolve();
    const row = this.rows.get(id);
    return row ? { ...row } : null;
  }

  /**
   * UPDATE products SET stock = $3, version = version + 1
   * WHERE id = $1 AND version = $2
   *
   * Resolves to the row count: 1 if the row still had `expectedVersion`, 0 if another writer
   * committed a change since you read it.
   */
  async updateStockIfVersion(id: string, expectedVersion: number, stock: number): Promise<number> {
    this.writeAttempts += 1;
    if (this.writeAttempts > RUNAWAY_LIMIT) {
      throw new Error(`runaway retry loop: ${RUNAWAY_LIMIT} write attempts and still going`);
    }

    const other = this.otherWritesBeforeNextWrite.shift();
    if (other) this.commitOtherWrite(other.id, other.stock);
    if (this.otherWriterBeforeEveryWrite) {
      const row = this.rows.get(id);
      if (row) this.commitOtherWrite(id, row.stock);
    }

    await Promise.resolve();
    const row = this.rows.get(id);
    if (!row || row.version !== expectedVersion) return 0;
    this.rows.set(id, { ...row, stock, version: row.version + 1 });
    return 1;
  }

  // ── What other transactions do (used by the tests and the preview) ──────────────────────

  /** Just before your next write, another transaction commits `stock` for this product. */
  otherWriterCommitsBeforeNextWrite(id: string, stock: number): void {
    this.otherWritesBeforeNextWrite.push({ id, stock });
  }

  /** Another transaction commits before every one of your writes, so none can succeed. */
  otherWriterCommitsBeforeEveryWrite(): void {
    this.otherWriterBeforeEveryWrite = true;
  }

  /** The row as currently committed (no side effects, not counted as a read). */
  peek(id: string): Product | undefined {
    const row = this.rows.get(id);
    return row ? { ...row } : undefined;
  }

  private commitOtherWrite(id: string, stock: number): void {
    const row = this.rows.get(id);
    if (row) this.rows.set(id, { ...row, stock, version: row.version + 1 });
  }
}
