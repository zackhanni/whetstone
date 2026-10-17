`orders.ts` holds four helpers for an orders screen. Each one returns the right answer on a small,
friendly input, which is why they shipped. Each one also has a bug that only shows up on real
data:

1. **`attachCustomers`** joins orders to customers with `customers.find(…)` inside
   `orders.map(…)`. With 5,000 customers and 10,000 orders that is up to 50 million comparisons.
   The test counts how many times your code reads a customer out of the array.
2. **`dedupeOrders`** uses `new Set(orders)`. Infinite scroll fetched two pages that overlap, so
   order 2 arrives twice — as two separate objects with the same `id`.
3. **`countTags`** counts into a plain object. Staff type tags freely, and someone typed
   `constructor`.
4. **`saveCustomerIndex` / `loadCustomerIndex`** put a `Map` through JSON for `localStorage`. Open
   the preview and look at what was saved.

The types (`Customer`, `Order`, `OrderRow`) are in `types.ts`.

## Hints

- Build a `Map` from `customers` once, before the loop: `new Map(customers.map((c) => [c.id, c]))`.
- To dedupe objects, key them by `id`. A `Map` keeps a repeated key at its first position.
- A `Map` has no inherited keys; an object made with `{}` inherits `constructor`, `toString` and a
  `__proto__` setter.
- Save the entries (`[...index]`), not the `Map`, and rebuild with `new Map(…)`. Going through
  `Object.fromEntries` turns the key `7` into the string `"7"`.
