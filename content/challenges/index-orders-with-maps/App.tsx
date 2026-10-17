import { attachCustomers, countTags, dedupeOrders, loadCustomerIndex, saveCustomerIndex } from "./orders";
import type { Customer, Order } from "./types";

const customers: Customer[] = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Grace" },
];

const orders: Order[] = [
  { id: 10, customerId: 2, total: 30, tags: ["sale", "constructor"] },
  { id: 11, customerId: 1, total: 12, tags: ["constructor"] },
  { id: 11, customerId: 1, total: 12, tags: ["constructor"] }, // page overlap: same id again
  { id: 12, customerId: 99, total: 5, tags: ["__proto__"] },
];

export default function App() {
  const unique = dedupeOrders(orders);
  const rows = attachCustomers(unique, customers);
  const tags = countTags(unique);
  const index = new Map(customers.map((c) => [c.id, c] as const));
  const saved = saveCustomerIndex(index);
  const restored = loadCustomerIndex(saved);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Orders screen helpers</h3>
      <div>rows: {rows.map((r) => `#${r.id} ${r.customerName}`).join(" · ")}</div>
      <div>tags: {JSON.stringify([...tags])}</div>
      <div>saved index: {saved}</div>
      <div>restored.get(1): {JSON.stringify(restored.get(1)) ?? "undefined"}</div>
    </div>
  );
}
