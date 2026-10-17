The todo app keeps a websocket open, and the server pushes two events. Their handlers live in
`cache-sync.ts`, and both are wrong:

- `onTodoRenamed(queryClient, todo)` — someone renamed a todo, and the push carries the full,
  updated row. Every connected client receives it, so it must **not** cause a request: a busy
  board would turn each rename into a request storm. Right now the list on screen keeps the old
  title, and the open detail only updates after a refetch.
- `onTodoCreated(queryClient)` — someone created a todo. The push doesn't include it, so only
  the server knows which lists it belongs in. Right now it shows up in the list on screen, but
  switching to the other filter shows that list without it.

The app runs with `staleTime: 60_000`, so nothing refetches by itself: the cache is only as
current as these handlers make it. `keys.ts`, `TodoScreen.tsx` and `api.ts` are fine as they
are.

## Hints

- Holding the new value for one exact key is a job for `setQueryData`; for a whole family of
  keys, `setQueriesData` with filters.
- An updater must **return new data**. Editing the row you were handed changes the cache, but
  `data` stays the same reference, so the components reading it don't re-render.
  `old?.map(...)` returns a new array (and `undefined` for an entry with no data yet).
- `refetchQueries({ type: "active" })` fetches what's on screen and leaves everything else
  "fresh". `invalidateQueries` marks every match stale — overriding `staleTime` — and refetches
  only the ones on screen.
