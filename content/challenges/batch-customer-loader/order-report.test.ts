import { buildOrderReport, createCustomerLoader } from "./order-report";
import { FakeDb, type Customer, type Order } from "./db";

// Stored (and returned) in name order: Ada c4, Grace c2, Linus c3, Margaret c1.
const people: Customer[] = [
  { id: "c1", name: "Margaret" },
  { id: "c2", name: "Grace" },
  { id: "c3", name: "Linus" },
  { id: "c4", name: "Ada" },
];

/** `count` orders, cycling through `customerIds`, with ids 1..count. */
function ordersFor(customerIds: string[], count: number): Order[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    customerId: customerIds[i % customerIds.length],
    total: (i + 1) * 10,
  }));
}

const TIMED_OUT = "timed out: a load never resolved";

/** Waits for `promise`, but gives up after a generous deadline instead of hanging the suite. */
async function within<T>(promise: Promise<T>, ms = 1500): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => resolve(TIMED_OUT), ms);
  });
  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

describe("order report", () => {
  it("sends one customer query for a page of 50 orders", async () => {
    const db = new FakeDb(people, ordersFor(["c1", "c2", "c3", "c4"], 50));
    const report = await within(buildOrderReport(db));
    expect(report === TIMED_OUT ? TIMED_OUT : report.length).toBe(50);
    expect(db.customerQueries).toBe(1);
  });

  it("gives each concurrent load the customer it asked for", async () => {
    const db = new FakeDb(people, []);
    const loader = createCustomerLoader(db);
    const result = await within(Promise.all([loader.load("c3"), loader.load("c1"), loader.load("c2")]));
    expect(result === TIMED_OUT ? TIMED_OUT : result.map((c) => c?.name).join(",")).toBe(
      "Linus,Margaret,Grace",
    );
  });

  it("resolves a load for a deleted customer with null, and the report says so", async () => {
    // Customer c0 was deleted. Its id sorts before every real one, so "sort both lists by id and
    // match by position" shifts every answer by one — only matching by id survives this.
    const db = new FakeDb(people, [
      { id: 1, customerId: "c1", total: 10 },
      { id: 2, customerId: "c0", total: 20 },
      { id: 3, customerId: "c2", total: 30 },
    ]);
    const loader = createCustomerLoader(db);
    const result = await within(Promise.all([loader.load("c1"), loader.load("c0")]));
    expect(result === TIMED_OUT ? TIMED_OUT : result[0]?.name).toBe("Margaret");
    expect(result === TIMED_OUT ? TIMED_OUT : result[1]).toBeNull();

    const report = await within(buildOrderReport(db));
    expect(report === TIMED_OUT ? TIMED_OUT : report.map((r) => r.customerName).join(",")).toBe(
      "Margaret,(deleted customer),Grace",
    );
  });

  it("sends each customer id at most once per batch", async () => {
    const db = new FakeDb(people, []);
    const loader = createCustomerLoader(db);
    const result = await within(Promise.all([loader.load("c2"), loader.load("c2"), loader.load("c4")]));
    const firstBatch = db.customerBatches[0] ?? [];
    expect([...firstBatch].sort().join(",")).toBe("c2,c4");
    expect(result === TIMED_OUT ? TIMED_OUT : result.map((c) => c?.name).join(",")).toBe(
      "Grace,Grace,Ada",
    );
  });

  it("includes every order, past the 1,000-row cap on a single read", async () => {
    // 40 customers whose name order is the reverse of their id order.
    const many: Customer[] = Array.from({ length: 40 }, (_, i) => ({
      id: `k${String(i + 1).padStart(2, "0")}`,
      name: `Customer ${String(40 - i).padStart(2, "0")}`,
    }));
    const orders = ordersFor(many.map((c) => c.id), 2500);
    const db = new FakeDb(many, orders);
    const nameOf = new Map(many.map((c) => [c.id, c.name]));

    const report = await within(buildOrderReport(db));
    expect(report === TIMED_OUT ? TIMED_OUT : report.length).toBe(2500);
    if (report !== TIMED_OUT) {
      const wrong = report.filter((row) => row.customerName !== nameOf.get(orders[row.orderId - 1].customerId));
      expect(wrong.length).toBe(0);
    }
  });
});
