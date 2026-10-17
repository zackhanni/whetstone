import { useEffect, useState } from "react";
import { reserveStock } from "./reserve-stock";
import { ProductStore } from "./product-store";

type Line = { label: string; result: string };

async function scenario(label: string, setup: (s: ProductStore) => void, stock: number, qty: number): Promise<Line> {
  const store = new ProductStore([{ id: "pen", stock, version: 1 }]);
  setup(store);
  try {
    const product = await reserveStock(store, "pen", qty);
    return { label, result: `resolved stock=${product.stock}; committed stock=${store.peek("pen")?.stock} (writes: ${store.writeAttempts})` };
  } catch (err) {
    const name = err instanceof Error ? err.name : String(err);
    return { label, result: `${name}; committed stock=${store.peek("pen")?.stock} (writes: ${store.writeAttempts})` };
  }
}

export default function App() {
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    Promise.all([
      scenario("no other writer: 10, reserve 2 (want 8)", () => {}, 10, 2),
      scenario("another writer sells 3 first: 10, reserve 2 (want 5)", (s) => s.otherWriterCommitsBeforeNextWrite("pen", 7), 10, 2),
      scenario("another writer leaves 1: 3, reserve 2 (want OutOfStockError)", (s) => s.otherWriterCommitsBeforeNextWrite("pen", 1), 3, 2),
      scenario("always conflicting (want ConflictError after 3 writes)", (s) => s.otherWriterCommitsBeforeEveryWrite(), 10, 2),
    ]).then(setLines);
  }, []);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>reserveStock — scenarios</h3>
      {lines.map((l) => (
        <div key={l.label} style={{ marginBottom: 10 }}>
          <div style={{ color: "#666" }}>{l.label}</div>
          <div>{l.result}</div>
        </div>
      ))}
    </div>
  );
}
