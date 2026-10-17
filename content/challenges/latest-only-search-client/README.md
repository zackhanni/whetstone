`createSearchClient()` backs a search-as-you-type box. The UI calls `search(query)` on every
(debounced) change and `cancel()` when the box is cleared, and renders `getState()`:
`{ query, status, results, error }`.

`search-api.ts` is the backend (read-only). Like `fetch`, it takes an `AbortSignal` and rejects
with `signal.reason` when that signal aborts. The client's `timeoutMs` option defaults to
`TIMEOUT_MS` from `config.ts`, which the tests use (the preview passes a longer one).

On a fast connection the client looks fine. On a real one it has four problems:

- Every keystroke's request runs to completion, even after a newer query has replaced it.
- Responses arrive in random order, and **whichever arrives last** is shown, so the box can say
  "rea" while showing the results for "r".
- Clearing the box shows **"Search failed"**: the cancellation is reported as an error. Fast
  typists would see the same flash on every superseded search, once requests are aborted.
- A request that hangs leaves the box on "loading" forever.

## Hints

- Keep the newest search's `AbortController` in a variable. A new `search()` aborts it before
  replacing it.
- "Is this search still the newest?" is a question about your own bookkeeping: compare the
  search's own controller with the current one. Ask it before **every** write to `state`, in the
  `try` and in the `catch`. That covers requests that ignore their signal, and `cancel()` (which
  leaves no current search).
- `AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)])` gives one signal with
  both ways to stop. A timeout rejects with a `DOMException` whose `name` is `"TimeoutError"`.
