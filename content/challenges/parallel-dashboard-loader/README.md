`loadDashboard(userId)` builds a dashboard: the signed-in user, then three panels (orders,
notifications, recommendations). The panels are keyed by the user's `accountId`, which only
`getUser` returns, so the user has to come first. The panels don't depend on each other.

`api.ts` is the backend (read-only), and `config.ts` holds the request latency the tests use.
The loader works on a good day. Its three bugs show up on a bad one:

- **The user service is down.** The loader swallows the error and "succeeds" with no user. The
  screen breaks somewhere else, and the real cause never reaches your error tracker.
- **It's slow.** The panels load one after another, so the page takes the sum of three requests
  instead of the slowest one.
- **One panel's service is down.** A flaky recommendations service blanks the whole dashboard,
  when it should show the other panels and an error box in its place.

## Hints

- Delete the `.catch(() => undefined)`. If the caller can't do anything useful without a user,
  rejecting with the real error is the correct behaviour.
- Start all three `getPanel` calls before awaiting any of them: `PANELS.map(…)` gives you an
  array of promises.
- Starting all three and then awaiting them one at a time isn't enough: a panel that fails while
  you're still awaiting an earlier one has no handler yet, which is an unhandled rejection (see
  the unhandled-rejections reading in `promises-and-async-await`).
- `Promise.all` rejects as soon as one panel fails. `Promise.allSettled` waits for all of them
  and gives you `{ status: "fulfilled", value }` or `{ status: "rejected", reason }` for each, in
  the same order as `PANELS`.
