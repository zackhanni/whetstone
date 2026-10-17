`TodoList` shows a paged todo list with a **Refresh** button. Users complain that it flickers:

- Every **Refresh** wipes the list and shows *Loading todos…*, although the old list was
  perfectly good while the new one loaded.
- When a refresh fails, the list disappears behind an error message — the last good data is
  thrown away.
- **Next** blanks the list too, and the user loses their place until the next page arrives.

Make the list behave like a cache: show the loading screen only when there is nothing to show
yet, keep data on screen through background fetches and failed refetches, and keep the current
page visible while the next one loads.

The tests render `TodoList` with their own `QueryClient` (retries off) and a fake server they
can pause or make fail through `api.ts`.

## Hints

- `status` answers "do we have data?" and `fetchStatus` answers "is the `queryFn` running?".
  `isPending` comes from the first, `isFetching` from the second.
- When a refetch fails, `status` becomes `"error"` but `data` keeps the last successful result.
  So "no data" is the case for the error panel; "error *and* data" is a banner over the list.
- `placeholderData: keepPreviousData` (imported from `@tanstack/react-query`) keeps the
  previous key's data while the new key loads, and sets `isPlaceholderData` while it does.
