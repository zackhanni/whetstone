import type { Customer, Order, OrderRow } from "./types";

/**
 * Helpers for the orders screen. Each one "works" on a small, friendly input. Four bugs, in the
 * order worth fixing them:
 *   1. attachCustomers scans the whole customer list once per order.
 *   2. dedupeOrders keeps both copies of an order that two overlapping pages returned.
 *   3. countTags breaks on tags that collide with keys every object already has.
 *   4. saveCustomerIndex / loadCustomerIndex lose the whole index (and then the numeric keys).
 */

/** Each order plus its customer's name, or "(unknown)" when the customer no longer exists. */
export function attachCustomers(orders: Order[], customers: Customer[]): OrderRow[] {
  return orders.map((order) => {
    const customer = customers.find((c) => c.id === order.customerId);
    return { ...order, customerName: customer ? customer.name : "(unknown)" };
  });
}

/** One order per id, in the order each id was first seen. */
export function dedupeOrders(orders: Order[]): Order[] {
  return [...new Set(orders)];
}

/** How many orders carry each tag. Tags are free text typed by staff. */
export function countTags(orders: Order[]): Map<string, number> {
  const counts: Record<string, number> = {};
  for (const order of orders) {
    for (const tag of order.tags) {
      counts[tag] = (counts[tag] || 0) + 1;
    }
  }
  return new Map(Object.entries(counts));
}

/** Serialise the customer index for localStorage. */
export function saveCustomerIndex(index: Map<number, Customer>): string {
  return JSON.stringify(index);
}

/** Rebuild the index saved by saveCustomerIndex. */
export function loadCustomerIndex(json: string): Map<number, Customer> {
  const parsed = JSON.parse(json) as Record<string, Customer>;
  return new Map(Object.entries(parsed)) as unknown as Map<number, Customer>;
}
