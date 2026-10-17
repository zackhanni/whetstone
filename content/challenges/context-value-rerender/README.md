`ThemeLabel` is wrapped in `React.memo` and reads only the `theme` from context. It should
re-render only when the theme changes. But every time you click **Tick** in `Settings` — an
update that has nothing to do with the theme — the label's render count climbs anyway.

The reason: `Settings` builds a **fresh `value` object on every render** (and a fresh
`toggleTheme` function). React Context compares its value **by identity**, so when `Settings`
re-renders for the tick, the context value looks "new" and **every consumer re-renders** —
`memo` can't help, because the change comes through context, not props.

## Hints

- Two things are new on every render: the `value` object and the `toggleTheme` function
  inside it. Memoizing only the object doesn't help while one of its dependencies is a
  fresh function each time.
- Give `toggleTheme` a stable identity first (`useCallback`). It already uses the functional
  form of `setTheme`, so it doesn't need to read `theme` and can keep one identity forever.
- Then memoize the object (`useMemo`) on exactly what it's built from. An unrelated tick
  should re-render `Settings` but hand the provider the very same object, so the memo'd
  consumer is skipped — while a theme change still produces a new one.
