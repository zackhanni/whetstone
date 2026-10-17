/**
 * A fake database that behaves like PostgreSQL behind PostgREST (Supabase) and counts every query.
 * Each method is one query (SQL shown above it). Read-only support file — your code goes in
 * order-report.ts.
 */
export type Customer = { id: string; name: string };
export type Order = { id: number; customerId: string; total: number };
export type ReportRow = { orderId: number; customerName: string; total: number };

/** Like PostgREST's db-max-rows (Supabase's default is 1,000): no response holds more rows. */
export const MAX_ROWS = 1000;

// A loop that never stops paging would freeze the tab; this turns it into a failing test.
const RUNAWAY_LIMIT = 10_000;

export class FakeDb {
  /** Every customer query's id list, in the order the queries were sent. */
  readonly customerBatches: string[][] = [];
  orderQueries = 0;

  private readonly customers: Customer[];
  private readonly orders: Order[];

  constructor(customers: Customer[], orders: Order[]) {
    // Stored sorted by name: the order rows come back in when there's no ORDER BY.
    this.customers = [...customers].sort((a, b) => a.name.localeCompare(b.name));
    this.orders = [...orders].sort((a, b) => a.id - b.id);
  }

  get customerQueries(): number {
    return this.customerBatches.length;
  }

  /**
   * SELECT id, customer_id, total FROM orders
   * WHERE id > $afterId ORDER BY id LIMIT $limit
   *
   * Never returns more than MAX_ROWS rows, whatever `limit` says — and says nothing when it cuts
   * the result short.
   */
  async listOrders(options: { afterId?: number; limit?: number } = {}): Promise<Order[]> {
    this.orderQueries += 1;
    if (this.orderQueries > RUNAWAY_LIMIT) throw new Error("runaway paging loop: 10,000 order queries");
    await Promise.resolve();
    const afterId = options.afterId ?? 0;
    const limit = Math.min(options.limit ?? MAX_ROWS, MAX_ROWS);
    return this.orders.filter((o) => o.id > afterId).slice(0, limit).map((o) => ({ ...o }));
  }

  /**
   * SELECT id, name FROM customers WHERE id = ANY($1)
   *
   * No ORDER BY: rows come back in storage order (by name), not in the order of `ids`. Each
   * matching customer appears once, however many times its id is in the list, and an id with no
   * row (a deleted customer) simply returns nothing.
   */
  async customersByIds(ids: readonly string[]): Promise<Customer[]> {
    this.customerBatches.push([...ids]);
    if (this.customerBatches.length > RUNAWAY_LIMIT) throw new Error("runaway loop: 10,000 customer queries");
    await Promise.resolve();
    const wanted = new Set(ids);
    return this.customers.filter((c) => wanted.has(c.id)).map((c) => ({ ...c }));
  }
}
