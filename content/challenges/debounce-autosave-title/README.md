`EditableTitle` is an inline rename field. It calls `onCommit` — a network write, in the
real app — on **every keystroke**. Typing `Hello` sends five saves, and the last one can
even land out of order.

Turn it into a debounced autosave.

## Hints

- The `setTimeout` handle must survive re-renders but must never re-render:
  `const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`.
- Schedule with `timer.current = setTimeout(() => onCommit(value), SAVE_DELAY_MS)` after
  `clearTimeout(timer.current)`.
- Pass `e.target.value` into the scheduler — `text` inside the handler is one render behind.
- Unmount cleanup is an effect that returns _only_ a cleanup:
  `useEffect(() => () => { … }, [])`.

`SAVE_DELAY_MS` lives in `config.ts` (short, so the tests are fast) and is shared with the
test file — import it instead of hard-coding a number.
