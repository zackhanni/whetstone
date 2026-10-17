`DescriptionEditor` has three `useEffect`s. Only one of them should exist — and that one
is written wrong. Symptoms: you can't type, the character count never moves, and a single
window resize bumps the counter by more than one.

## Hints

- **Effect 1** keeps `count` in sync with `text`. Ask whether `count` holds anything
  `text` doesn't already know. Fixing its dependency array still leaves a second render
  after every keystroke, and the tests count renders.
- **Effect 2** copies the prop into state after *every* render, so it overwrites each
  keystroke. Ask what already gives `text` its first value. (Resetting the draft for a
  *different* record is the parent's job, done with a `key`.)
- **Effect 3** is a genuine subscription. The cleanup can only remove a listener it can
  name, and the dependency array decides how many times it subscribes.

Attack order: **derive → delete → fix the deps/cleanup on what's left.**
