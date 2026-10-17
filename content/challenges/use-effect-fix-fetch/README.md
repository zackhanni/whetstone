`SearchUsers` fetches results whenever the query changes. It works for a single search,
but it has two bugs that show up the moment requests overlap:

- **Race condition:** if an earlier (slower) request resolves *after* a newer one, the
  stale results overwrite the fresh ones.
- **Leak / no cancellation:** in-flight requests are never aborted when the query changes
  or the component unmounts.

**Bonus:** discuss why a library like TanStack Query removes the need to write this by hand.
