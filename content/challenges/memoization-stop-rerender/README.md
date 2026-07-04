# Stop the memo child from re-rendering

`Child` is wrapped in `React.memo`, so it should skip re-rendering while its props
stay shallow-equal. But every time you click **Tick** in `Parent`, the child's
render count climbs anyway.

The reason: `Parent` defines `handleChildClick` fresh on every render, so it has a
**new identity** each time. `memo`'s shallow prop check sees a "different" `onClick`
and re-renders the child on every unrelated update — the `memo` buys nothing.

## Your task

Edit **`Parent.tsx`** so the tests pass. (Do not edit `Child.tsx` — the fix lives in
the parent.)

- [ ] The child renders once on mount (render count shows **1**)
- [ ] Clicking **Tick** does **not** re-render the child (render count stays **1**)
- [ ] The child's own **Child action** button still fires its callback

**Hint:** give `handleChildClick` a stable identity with
`useCallback(fn, deps)`. Since it only calls `setLastClicked` (a stable setter), the
dependency array is empty.

## Running

In Whetstone this runs in-browser and grades automatically. The reference solution
lives in `solution.tsx`.
