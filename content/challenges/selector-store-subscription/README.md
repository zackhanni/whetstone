`counter-store.ts` is a store outside React — a value, a `Set` of listeners, and a `set`
that shallow-merges and notifies. That's what zustand's `create` builds for you.

The React binding is the interesting part, and it's currently wrong: `useStore` copies the
**whole** state into local state on every notification, so `OtherLabel` re-renders when
`count` changes even though it only reads `other`. That's the Context behaviour a store is
supposed to fix.

## Hints

- `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)` is React's API for
  reading state that lives outside React. It re-renders only when the snapshot changes by
  `Object.is`.
- `store.subscribe` already returns its own unsubscribe function — exactly the shape
  `useSyncExternalStore` wants. Pass it directly; don't wrap it in a new arrow each render.
- The snapshot is `() => selector(store.getState())`. Pass the same function for the server
  snapshot.
- Watch the render counters in the preview: with a whole-store subscription both climb
  together, with selector subscriptions only the one that changed does.
