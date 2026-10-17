`SearchUsers` fetches results whenever the query changes. It works for a single search,
but it has three bugs that show up the moment requests overlap or fail:

- **Race condition:** if an earlier (slower) request resolves *after* a newer one, the
  stale results overwrite the fresh ones.
- **No cancellation:** in-flight requests keep running after the query changes or the
  component unmounts, wasting network and server work on responses nobody will use.
- **Silent failures:** a request that fails is never caught. The user sees nothing, and the
  console gets an unhandled promise rejection.

Show a failed search in an element with `role="alert"`. A request you cancelled is not a
failure, so it must not show up there.

**Bonus:** discuss why a library like TanStack Query removes the need to write this by hand.
