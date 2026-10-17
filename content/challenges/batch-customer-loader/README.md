`buildOrderReport` lists every order with its customer's name. Someone already added a batching
loader to stop the N+1 — `createCustomerLoader` collects the `load(id)` calls made in one tick and
sends them as a single query — and the report still makes one customer query per order. The loader
has its own bugs too, and the report quietly stops at 1,000 orders.

`db.ts` behaves like PostgreSQL behind PostgREST/Supabase and counts every query:

```sql
-- db.listOrders({ afterId, limit }) — never more than MAX_ROWS (1,000) rows, and no error when it cuts off
SELECT id, customer_id, total FROM orders WHERE id > $1 ORDER BY id LIMIT $2;

-- db.customersByIds(ids) — no ORDER BY, one row per matching id, nothing for a missing id
SELECT id, name FROM customers WHERE id = ANY($1);
```

The tests check the query count (`db.customerQueries`), the id list of every batch
(`db.customerBatches`), and that every row carries the right name. A load that never resolves fails
its test after a short deadline instead of hanging.

## Hints

- `await` inside a `for` loop ends the tick after every load, so the loader never sees more than
  one id. Map the page's orders to loads first, then `await Promise.all(…)`. (`Promise.all` keeps
  its input order, so its results line up with the page.)
- In the loader, build a `Map` from id to row and resolve each waiting caller with
  `map.get(id) ?? null`. That one change handles both the shuffled order and the missing customer.
- `new Set(ids)` dedupes the batch; every waiting caller is still resolved from the map.
- Page with the last order id you saw: `listOrders({ afterId, limit: MAX_ROWS })`, until a page
  comes back with fewer than `MAX_ROWS` rows.
