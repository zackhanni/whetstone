`ThemeLabel` is wrapped in `React.memo` and reads only the `theme` from context. It should
re-render only when the theme changes. But every time you click **Tick** in `Settings` — an
update that has nothing to do with the theme — the label's render count climbs anyway.

The reason: `Settings` builds a **fresh `value` object on every render** (and a fresh
`toggleTheme` function). React Context compares its value **by identity**, so when `Settings`
re-renders for the tick, the context value looks "new" and **every consumer re-renders** —
`memo` can't help, because the change comes through context, not props.

## Hints

Give the context value a stable identity. Stabilize `toggleTheme` with
`useCallback(fn, [])`, then wrap the object in `useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])`.
Now an unrelated tick re-renders `Settings` but leaves the context value referentially equal,
so the memo'd consumer is skipped.
