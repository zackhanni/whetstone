`counter-store.ts` is a store outside React — a value, a `Set` of listeners, and a `set`
that shallow-merges and notifies. That's what Zustand's `create` builds for you.

The React binding is the interesting part, and it's currently wrong: `useStore` copies the
**whole** state into local state on every notification, so `OtherLabel` re-renders when
`count` changes even though it only reads `other`. That's the Context behaviour a store is
supposed to fix. It also subscribes in an effect, so a store change made while the
component is mounting (by a sibling's layout effect, say) never reaches it.

## Hints

- `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` is React's API for
  reading state that lives outside React. It re-renders only when the snapshot changes by
  `Object.is`.
- `store.subscribe` already returns its own unsubscribe function — exactly the shape
  `useSyncExternalStore` wants. Pass it directly; don't wrap it in a new arrow each render.
- The snapshot is the **selected** value of the store's current state, not the whole state —
  that's what lets React compare slices. Pass the same function for the server snapshot —
  fine here, since nothing is server-rendered. (Zustand v5 passes the store's *initial*
  state instead; the unit's complex reading explains why that matters.)
- Copying the slice into `useState` from an effect is not enough: a change that lands
  before the effect subscribes is lost. `useSyncExternalStore` re-checks the snapshot after
  it subscribes, which is one reason it exists.
- Watch the render counters in the preview: with a whole-store subscription both climb
  together, with selector subscriptions only the one that changed does.
