`DescriptionEditor` has three `useEffect`s. Only one of them should exist — and that one
is written wrong. Symptoms: you can't type, the character count never moves, and a single
window resize bumps the counter by more than one.

## Hints

- **Effect 1** keeps `count` in sync with `text`. Anything you can compute during render
  isn't state: `const count = text.length` and the effect disappears.
- **Effect 2** copies the prop into state after *every* render, so it overwrites each
  keystroke. Delete it — `useState(description)` already seeds the initial value. (To
  reset when a *different* record loads, the parent remounts with a `key`.)
- **Effect 3** is a genuine subscription, but it needs a named handler, a
  `return () => window.removeEventListener("resize", onResize)` cleanup, and `[]` deps so
  it subscribes once instead of once per render.

Attack order: **derive → delete → fix the deps/cleanup on what's left.**
