`Child` is wrapped in `React.memo`, so it should skip re-rendering while its props
stay shallow-equal. But every time you click **Tick** in `Parent`, the child's
render count climbs anyway.

The reason: `Parent` defines `handleChildClick` fresh on every render, so it has a
**new identity** each time. `memo`'s shallow prop check sees a "different" `onClick`
and re-renders the child on every unrelated update — the `memo` buys nothing.

## Hints

- `useCallback(fn, deps)` hands back the same function on every render until a
  dependency changes.
- Put in the dependency array only what the callback reads that can change. A `useState`
  setter keeps the same identity on every render.
