`startPolling(task, { intervalMs, onError })` keeps a dashboard fresh: it calls `task` (an async
function that fetches and renders), waits, and calls it again until the caller runs the
`stop()` function it returned. `config.ts` sets the interval the tests use.

It's built on `setInterval`, and it has the three bugs that version always has in production:

- When the server is slower than the interval, requests **overlap**. Load piles onto a struggling
  server, and responses can land out of order.
- The first data appears only after a whole interval.
- One failed request **ends polling for good**, and nothing on screen says so.

Rebuild it as a recursive `setTimeout`. Two further tests guard `stop()`, which the naive
rewrite usually breaks: once you schedule the next poll after `await task()`, there are moments
when no timer exists yet.

## Hints

- The shape: an async `tick()` that awaits the task, handles any error, then
  `setTimeout(tick, intervalMs)`. Call `tick()` once yourself to start.
- Put only `await task()` inside `try`. If the scheduling line is inside it too, a rejection
  skips it.
- `stop()` needs two things: `clearTimeout(timer)` for the waiting state, and a `stopped` flag
  that `tick` checks after the `await` for the in-flight state. `clearTimeout(undefined)` is a
  safe no-op.
- Type the handle as `ReturnType<typeof setTimeout>`, which is right whether `setTimeout`
  returns a number (browsers) or a `Timeout` object (Node).
