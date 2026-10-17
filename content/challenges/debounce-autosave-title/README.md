`EditableTitle` is an inline rename field. It calls `onCommit` — a network write, in the
real app — on **every keystroke**. Typing `Hello` sends five saves, and the last one can
even land out of order.

Turn it into a debounced autosave.

## Hints

- The `setTimeout` handle must survive re-renders, must not cause one, and must belong to
  this instance alone (two fields on a page must not cancel each other's saves). Only one
  hook fits all three. `ReturnType<typeof setTimeout>` types it in the browser and in Node.
- Each keystroke hands back the previous receipt before taking a new one.
- Inside the change handler, `text` is still the previous render's value. The event has the
  fresh one.
- Blur and the timer should go through one function that remembers what was last saved.
  Forget the timer's receipt once it fires, too.
- Unmount cleanup is an effect with no dependencies to re-run on, whose body does nothing but
  return the cleanup.

`SAVE_DELAY_MS` lives in `config.ts` (short, so the tests are fast) and is shared with the
test file — import it instead of hard-coding a number.
