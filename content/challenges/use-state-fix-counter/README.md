# Fix the counter that only adds 1

`Counter` has an **Add 3** button, but each click only bumps the count by **1**.

The handler calls `setCount(count + 1)` three times — but `count` is a fixed
snapshot for that render, so all three calls set the same value and React batches
them into a single `1`.

## Your task

Edit **`Counter.tsx`** so the tests pass.

- [ ] Clicking **Add 3** increases the count by 3
- [ ] Two clicks reach 6
- [ ] The counter still starts at 0

**Hint:** the functional updater `setCount((c) => c + 1)` receives React's latest
value, so stacked updates compound.

## Running

In Whetstone this runs in-browser and grades automatically. The reference solution
lives in `solution.tsx`.
