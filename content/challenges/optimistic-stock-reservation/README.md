`reserveStock` takes stock from a product row using **optimistic concurrency**. `product-store.ts`
stands in for this table and these two statements:

```sql
-- products(id text PRIMARY KEY, stock int, version int)

SELECT id, stock, version FROM products WHERE id = $1;              -- store.read(id)

UPDATE products SET stock = $3, version = version + 1
WHERE id = $1 AND version = $2;                                       -- store.updateStockIfVersion(…)
```

The `UPDATE` only matches if the row still has the version you read. If another transaction
committed in between, the version moved on, nothing matches, and the statement reports **0 rows**.

The current code was written as if nobody else ever writes: it reads, checks, writes, and returns
— without looking at the row count. Under load that means overselling and "successful"
reservations that were never saved. The tests simulate the other writer with
`store.otherWriterCommitsBeforeNextWrite(id, stock)` (one transaction commits between your read
and your write) and `store.otherWriterCommitsBeforeEveryWrite()` (you can never win).

## Hints

- Treat one **attempt** as the whole read → check → write. A failed write means the read is stale,
  so the next attempt starts with a new read — retrying the `UPDATE` with the old version can never
  succeed.
- A `for` loop over `attempt = 1 … maxAttempts`, with the `throw new ConflictError(…)` after the
  loop, gives you the limit for free.
- When the write matches, the version check proved nothing changed since your read, so the row you
  just wrote is exactly what's committed.
- Production code would also wait a short, random time between attempts so two clients don't
  collide again in lockstep. The tests don't need it.
