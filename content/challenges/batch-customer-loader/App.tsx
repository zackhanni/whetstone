import { useEffect, useState } from "react";
import { buildOrderReport } from "./order-report";
import { FakeDb, type Customer, type Order, type ReportRow } from "./db";

const customers: Customer[] = [
  { id: "c1", name: "Margaret" },
  { id: "c2", name: "Grace" },
  { id: "c3", name: "Linus" },
  { id: "c4", name: "Ada" },
];

// 1,200 orders cycling through c1..c4 and one deleted customer ("gone").
const ids = ["c1", "c2", "gone", "c3", "c4"];
const orders: Order[] = Array.from({ length: 1200 }, (_, i) => ({
  id: i + 1,
  customerId: ids[i % ids.length],
  total: (i + 1) * 10,
}));

type Summary = { rows: ReportRow[]; customerQueries: number; orderQueries: number } | string;

export default function App() {
  const [summary, setSummary] = useState<Summary>("running…");

  useEffect(() => {
    const db = new FakeDb(customers, orders);
    const timeout = setTimeout(() => setSummary("still waiting after 2 s — a load never resolved"), 2000);
    buildOrderReport(db)
      .then((rows) => {
        clearTimeout(timeout);
        setSummary({ rows, customerQueries: db.customerQueries, orderQueries: db.orderQueries });
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        setSummary(`error: ${err instanceof Error ? err.message : String(err)}`);
      });
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Order report — 1,200 orders, 4 customers + 1 deleted</h3>
      {typeof summary === "string" ? (
        <div>{summary}</div>
      ) : (
        <>
          <div>rows: {summary.rows.length} (want 1200)</div>
          <div>customer queries: {summary.customerQueries} (want 2 — one per page)</div>
          <div>order queries: {summary.orderQueries}</div>
          <div style={{ marginTop: 8 }}>
            {summary.rows.slice(0, 5).map((r) => (
              <div key={r.orderId}>
                #{r.orderId} {r.customerName} {r.total}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
