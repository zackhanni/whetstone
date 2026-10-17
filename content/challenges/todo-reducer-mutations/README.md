`todos.ts` holds the reducer behind a todo list, and a selector for its A–Z view. Every case
returns something that *looks* new — `{ ...state }`, a copied array, a copied todo — so it reads
as immutable. It isn't: four lines change objects the previous state still holds, and React (an
undo history, a `memo` child, an effect) relies on the previous state staying exactly as it was.

Open the preview and click **Add**. It runs under `<StrictMode>`, which in development calls a
reducer twice and keeps one result — harmless for a pure reducer, and a visible duplicate for one
that pushes into shared state. Toggle a checkbox, click **tag** or switch to **A–Z** and watch for
similar surprises.

The tests keep the state they pass to the reducer and check it afterwards: the previous state must
look exactly as it did before the action.

`removed` is already correct — use it as the pattern.

## Hints

- Spread copies one level. Copy every level on the path to the thing you change: the array, the
  todo, and the todo's `tags`.
- `map` returning `{ ...t, done: !t.done }` for the matching todo (and `t` for the rest) replaces
  the find-and-mutate.
- `toSorted` (ES2023) returns a sorted copy; `sort` sorts in place.
- For the unknown id, check with `some` before building anything, and return `state` itself.
