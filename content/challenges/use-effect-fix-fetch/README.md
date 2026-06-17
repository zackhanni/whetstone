# Fix the search-as-you-type effect

`SearchUsers` fetches results whenever the query changes. It works for a single search,
but it has two bugs that show up the moment requests overlap:

- **Race condition:** if an earlier (slower) request resolves *after* a newer one, the
  stale results overwrite the fresh ones.
- **Leak / no cancellation:** in-flight requests are never aborted when the query changes
  or the component unmounts.

## Your task

Edit **`starter.tsx`** so all tests pass. You should not need to touch `api.ts`.

- [ ] Typing a query shows that query's results
- [ ] A slow earlier response never overwrites a newer query's results
- [ ] The in-flight request is aborted when the query changes or the component unmounts

**Bonus:** discuss why a library like TanStack Query removes the need to write this by hand.

## Running

In Whetstone this runs in-browser and grades automatically. To run it locally:

```bash
vitest run
```

The reference solution lives in `solution.tsx` (used to validate the tests during authoring).
