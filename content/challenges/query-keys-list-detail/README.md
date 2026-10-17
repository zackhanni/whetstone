A todo screen with an **Open / Done** filter and a detail panel. Both queries take their keys
from one factory, `todoKeys` — and the factory is wrong in three ways:

- Clicking **Done** highlights the button, but the list keeps showing open todos, and no
  request goes out.
- Selecting a second todo keeps showing the first todo's details.
- After a bulk change, `invalidateQueries({ queryKey: todoKeys.all })` refreshes the list but
  leaves the open detail stale.

Fix the keys. The components and their `queryFn`s are fine as they are.

The tests render `TodoScreen` with their own `QueryClient` and a fake server they control
through `api.ts`.

## Hints

- A key is the cache entry's identity. Anything the `queryFn` reads that can change belongs
  in it: `status` for a list, `id` for a detail.
- Named filters read well as an object (`{ status }`) — object property order doesn't change
  the hash.
- A prefix matches keys element by element from the start, so a detail key that should be
  reached by `todoKeys.all` has to **start** with `todoKeys.all`.
- Mirror the list side: `details: () => [...todoKeys.all, "detail"]`, then put the id after it.
