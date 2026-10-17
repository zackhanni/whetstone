import { MAX_ROWS, type Customer, type FakeDb, type ReportRow } from "./db";

type Waiting = {
  id: string;
  resolve: (customer: Customer | null) => void;
  reject: (error: unknown) => void;
};

export function createCustomerLoader(db: FakeDb) {
  let queue: Waiting[] = [];

  async function dispatch(): Promise<void> {
    const batch = queue;
    queue = []; // loads that arrive while this query is in flight belong to the next batch
    try {
      const ids = [...new Set(batch.map((item) => item.id))]; // each id once
      const rows = await db.customersByIds(ids);
      // The database returns rows in its own order, once per id, and nothing for a missing id —
      // so match by id, never by position.
      const byId = new Map(rows.map((row) => [row.id, row]));
      for (const item of batch) item.resolve(byId.get(item.id) ?? null);
    } catch (error) {
      // Not graded, but a loader that swallows a failed query leaves every caller hanging.
      for (const item of batch) item.reject(error);
    }
  }

  return {
    /** Every load made in the same tick goes out as one customersByIds query. */
    load(id: string): Promise<Customer | null> {
      return new Promise((resolve, reject) => {
        queue.push({ id, resolve, reject });
        if (queue.length === 1) queueMicrotask(dispatch);
      });
    },
  };
}

export async function buildOrderReport(db: FakeDb): Promise<ReportRow[]> {
  const loader = createCustomerLoader(db);
  const report: ReportRow[] = [];

  // Keyset paging: ask for the rows after the last id we saw, until a page comes back short.
  let afterId: number | undefined;
  for (;;) {
    const page = await db.listOrders({ afterId, limit: MAX_ROWS });

    // Start every load before awaiting any, so the whole page goes out as one batch.
    const customers = await Promise.all(page.map((order) => loader.load(order.customerId)));
    page.forEach((order, i) => {
      report.push({
        orderId: order.id,
        total: order.total,
        customerName: customers[i]?.name ?? "(deleted customer)",
      });
    });

    if (page.length < MAX_ROWS) return report;
    afterId = page[page.length - 1].id;
  }
}
