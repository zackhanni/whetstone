import type { Customer, Order, OrderRow } from "./types";

/** Each order plus its customer's name, or "(unknown)" when the customer no longer exists. */
export function attachCustomers(orders: Order[], customers: Customer[]): OrderRow[] {
  // Index once (one pass over customers), then every order is a single Map lookup.
  const customersById = new Map(customers.map((c) => [c.id, c]));
  return orders.map((order) => ({
    ...order,
    customerName: customersById.get(order.customerId)?.name ?? "(unknown)",
  }));
}

/** One order per id, in the order each id was first seen. */
export function dedupeOrders(orders: Order[]): Order[] {
  // A Set compares objects by identity, so two copies of order 7 are two entries. Key by id: a
  // repeated key keeps its first position (and takes the later copy, which is the fresher one).
  return [...new Map(orders.map((o) => [o.id, o])).values()];
}

/** How many orders carry each tag. Tags are free text typed by staff. */
export function countTags(orders: Order[]): Map<string, number> {
  // A Map has no inherited keys, so "constructor" and "__proto__" are ordinary tags here.
  const counts = new Map<string, number>();
  for (const order of orders) {
    for (const tag of order.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

/** Serialise the customer index for localStorage. */
export function saveCustomerIndex(index: Map<number, Customer>): string {
  // A Map stringifies to "{}". An array of [key, value] pairs keeps every entry, and keeps the
  // numeric keys numeric (going through an object would turn 7 into "7").
  return JSON.stringify([...index]);
}

/** Rebuild the index saved by saveCustomerIndex. */
export function loadCustomerIndex(json: string): Map<number, Customer> {
  return new Map(JSON.parse(json) as [number, Customer][]);
}
