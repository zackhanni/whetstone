`Counter` has an **Add 3** button, but each click only bumps the count by **1**.

The handler calls `setCount(count + 1)` three times — but `count` is a fixed
snapshot for that render, so all three calls set the same value and React batches
them into a single `1`.

## Hints

The functional updater `setCount((c) => c + 1)` receives React's latest
value, so stacked updates compound.
