The sandbox has no `vi.fn` or `vi.spyOn`, so build them. `spy.ts` holds a tiny test-double
library with two exports:

- `fn(impl?)` — a new function that records the arguments of every call in `.calls`, and runs
  `impl` (if given) to produce its result. This is a stub when you give it an answer to return,
  and a spy when you check `.calls` afterwards.
- `spyOn(obj, "method")` — swaps `obj.method` for a spy that still runs the original, and gives
  you `restore()` to put the original back.

The grader also uses your `fn` as the doubles for `checkout()` in `checkout.ts`: a stub for the
exchange rate and a spy for the receipt email.

A spy has one hard rule: **the code under test must not be able to tell it's there.** Same
arguments in, same `this`, same return value out — it only *watches*. Every bug in the starter
breaks that rule, or breaks the cleanup that makes it safe to use in more than one test.

## Hints

- A wrapper that calls `impl(...args)` throws away two things the caller gave it. One is the
  return value. The other is `this` — look at `Function.prototype.apply`.
- An arrow function can't receive `this` from its caller; the wrapper is a regular `function` for
  that reason.
- `delete obj.method` doesn't restore anything: it removes the property. Put back the exact
  function you replaced, which means keeping a reference to it before you replace it.
