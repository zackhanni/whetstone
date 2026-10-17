import {
  attachCustomers,
  countTags,
  dedupeOrders,
  loadCustomerIndex,
  saveCustomerIndex,
} from "./orders";
import type { Customer, Order } from "./types";

const order = (id: number, customerId: number, tags: string[] = []): Order => ({
  id,
  customerId,
  total: 10,
  tags,
});

/**
 * Wraps an array so the test can count how many times your code reads an element out of it
 * (customers[0], customers[1], …). Iterating, find, map and forEach all read through here.
 */
function countingArray<T>(items: T[]): { list: T[]; reads: () => number } {
  let reads = 0;
  const list = new Proxy(items, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && /^\d+$/.test(prop)) reads++;
      return Reflect.get(target, prop, receiver);
    },
  });
  return { list, reads: () => reads };
}

describe("attachCustomers", () => {
  it("attaches each order's customer name, and '(unknown)' for a missing customer", () => {
    const customers: Customer[] = [
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ];
    const rows = attachCustomers([order(10, 2), order(11, 1), order(12, 99)], customers);
    expect(rows.map((r) => r.customerName).join(",")).toBe("Grace,Ada,(unknown)");
    expect(rows.map((r) => r.id).join(",")).toBe("10,11,12");
  });

  it("reads each customer about once, not once per order (index the customers first)", () => {
    const customers = Array.from({ length: 200 }, (_, i) => ({ id: i, name: `c${i}` }));
    const orders = Array.from({ length: 200 }, (_, i) => order(1000 + i, 199 - i));
    const { list, reads } = countingArray(customers);

    const rows = attachCustomers(orders, list);

    expect(rows[0].customerName).toBe("c199");
    // A Map built in one pass reads 200 customers. A find() per order reads about 20,000.
    expect(reads()).toBeLessThanOrEqual(customers.length * 2);
  });
});

describe("dedupeOrders", () => {
  it("keeps one order per id when overlapping pages return separate copies", () => {
    const page1 = [order(1, 1), order(2, 1)];
    const page2 = [order(2, 1), order(3, 1)]; // order 2 again, as a different object
    const unique = dedupeOrders([...page1, ...page2]);
    expect(unique.map((o) => o.id).join(",")).toBe("1,2,3");

    // First-seen order: 5 came first, so it stays first even though its copy arrives last.
    expect(dedupeOrders([order(5, 1), order(6, 1), order(5, 1)]).map((o) => o.id).join(",")).toBe(
      "5,6",
    );
  });
});

describe("countTags", () => {
  it("counts every tag, including ones named like built-in object keys", () => {
    const counts = countTags([
      order(1, 1, ["sale", "constructor"]),
      order(2, 1, ["constructor", "toString"]),
      order(3, 1, ["__proto__", "sale"]),
    ]);
    expect(counts.get("sale")).toBe(2);
    expect(counts.get("constructor")).toBe(2);
    expect(counts.get("toString")).toBe(1);
    expect(counts.get("__proto__")).toBe(1);
    expect(counts.size).toBe(4);
  });
});

describe("saveCustomerIndex / loadCustomerIndex", () => {
  const index = new Map<number, Customer>([
    [7, { id: 7, name: "Ada" }],
    [42, { id: 42, name: "Grace" }],
  ]);

  it("round-trips every entry through a JSON string", () => {
    const json = saveCustomerIndex(index);
    expect(typeof json).toBe("string");
    expect(loadCustomerIndex(json).size).toBe(2);
  });

  it("keeps numeric keys numeric, so get(7) still finds Ada", () => {
    const restored = loadCustomerIndex(saveCustomerIndex(index));
    expect(restored.get(7)?.name).toBe("Ada");
    expect(restored.get(42)?.name).toBe("Grace");
  });
});
