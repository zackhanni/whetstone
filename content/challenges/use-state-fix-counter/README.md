`Counter` has two buttons, and both lose updates.

**Add 3** calls `setCount(count + 1)` three times — but `count` is a fixed snapshot for
that render (0), so all three calls queue the same update: "set to 1". React applies the
three in one re-render (that's batching), and the count lands on 1.

**Save +1** waits for a pretend server call, then adds 1. Click it twice before the first
save comes back and the count goes up by 1, not 2.

## Hints

- Both handlers compute the next count from a `count` captured when the handler was
  created. What does the setter accept besides a value?
- For **Save +1**, ask which render's `count` each click's handler reads after its `await`.
