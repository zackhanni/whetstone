import { useEffect, useState } from "react";
import { ProductCache } from "./product-cache";
import { FakeCache } from "./cache-store";
import { FakeProductDb } from "./product-db";

/** Runs a few reads and a price change against the cache and shows what each step saw. */
export default function App() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = new FakeProductDb();
      const cache = new FakeCache();
      const products = new ProductCache(cache, db);
      const out: string[] = [];
      const log = (line: string) => out.push(line);

      await Promise.all(Array.from({ length: 10 }, () => products.getProduct("p1")));
      log(`10 concurrent reads -> ${db.loads} database load(s)`);
      await products.updatePrice("p1", 999);
      log(`after updatePrice(999) -> read sees ${(await products.getProduct("p1")).price}`);
      cache.down = true;
      try {
        log(`cache down -> read sees ${(await products.getProduct("p2")).price}`);
      } catch (e) {
        log(`cache down -> read FAILED: ${(e as Error).message}`);
      }
      if (!cancelled) setLines(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>ProductCache</h3>
      {lines.length === 0 ? <div>running…</div> : lines.map((line) => <div key={line}>{line}</div>)}
    </div>
  );
}
