`rate-limit.ts` holds the two utilities a search box, an autosave and a scroll handler share:

- `debounce(fn, wait)` runs `fn` once, `wait` ms after the **last** call, with that call's
  `this` and arguments. The returned function also has `cancel()` (drop the pending run) and
  `flush()` (run it now).
- `throttle(fn, wait)` runs the first call immediately, then at most once per `wait`. Calls that
  arrive while the window is closed collapse into **one** trailing run, with the latest call's
  `this` and arguments, so the last value always gets through. It has `cancel()` too.

Both pass a quick manual test, which is how they shipped. The six bugs only show up in how
they're actually used: a debounced method on an object, a component that cancels on teardown,
a Save button that flushes, a scroll handler whose final position matters. The comment above
`debounce` lists them in the order worth fixing.

`WAIT_MS` in `config.ts` is the delay the tests use.

## Hints

- To receive the caller's `this`, the wrapper must be a `function`, not an arrow. Save `this`
  next to the arguments and call `fn.apply(savedThis, savedArgs)`.
- `timer` is your "is a run pending?" flag, but only if you set it back to `undefined` whenever
  a run happens, from the timer or from `flush()`.
- `cancel` and `flush` both need `clearTimeout(timer)`. Forgetting the handle doesn't stop the
  timer.
- In `throttle`, store the latest `this` and arguments on **every** call, and have the timer
  callback read those shared variables when it fires. Don't use the `this` and `args` it closed
  over when it was created.
