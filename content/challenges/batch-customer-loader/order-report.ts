import type { Customer, FakeDb, ReportRow } from "./db";

/**
 * Fix in this order (each one has its own failing test):
 *   1. buildOrderReport awaits each load inside the loop, so every load is a batch of one — one
 *      customer query per order. Start all of a page's loads before awaiting any of them.
 *   2. The loader hands rows to callers by position, but the database returns rows in its own
 *      order. Match each caller to its row by id.
 *   3. An id with no row (a deleted customer) leaves its caller waiting forever. Resolve it with null.
 *   4. Orders from the same customer put the same id into one batch several times. Send each id once.
 *   5. listOrders returns at most MAX_ROWS rows per call, without any error. Page through them all.
 */

type Waiting = { id: string; resolve: (customer: Customer | null) => void };

export function createCustomerLoader(db: FakeDb) {
  let queue: Waiting[] = [];

  async function dispatch(): Promise<void> {
    const batch = queue;
    queue = [];
    const rows = await db.customersByIds(batch.map((item) => item.id));
    rows.forEach((row, i) => batch[i].resolve(row));
  }

  return {
    /** Every load made in the same tick goes out as one customersByIds query. */
    load(id: string): Promise<Customer | null> {
      return new Promise((resolve) => {
        queue.push({ id, resolve });
        if (queue.length === 1) queueMicrotask(dispatch);
      });
    },
  };
}

export async function buildOrderReport(db: FakeDb): Promise<ReportRow[]> {
  const loader = createCustomerLoader(db);
  const orders = await db.listOrders();

  const report: ReportRow[] = [];
  for (const order of orders) {
    const customer = await loader.load(order.customerId);
    report.push({
      orderId: order.id,
      total: order.total,
      customerName: customer?.name ?? "(deleted customer)",
    });
  }
  return report;
}
