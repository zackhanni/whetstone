A payment provider posts JSON to your webhook. `parseEvent` takes the parsed body — typed
`unknown`, because nobody has checked it yet — and either returns a typed `AppEvent` or rejects
it. `feedLine` turns an event into a line for the activity feed. The event types are in
`types.ts`.

Everything compiles under `strict`. That's the point: each bug is a place where a check was
missing at **runtime**, or where the code told the compiler to stop checking:

- `typeof x === "object"` is true for `null`.
- A type guard (`x is …`) is a promise. TypeScript checks that the function returns a boolean,
  not that the body proves the claim.
- `as AppEvent` turns "a kind I've never seen" into a valid event.
- A `default` that returns a fallback string compiles forever, including after someone adds a
  member to the union. Make the compiler list the cases you forgot.

The preview runs six real bodies through the pipeline.

## Hints

- Rule out `null` explicitly after the `typeof` check.
- `in` proves a key exists; `typeof` proves what's in it.
- For the unknown kind, return `{ ok: false, error: … }` from the `default` branch.
- In `feedLine`, handle `"cancel"`, then make the `default` assign the event to a `never`-typed
  variable (and throw, for data that slips past the types).
