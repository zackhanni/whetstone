`useToggleTodo` ticks a checkbox optimistically: `onMutate` writes the new `done` value into the
cached list before the PATCH is sent. That part works. The rest of the recipe is missing:

- If a background refetch was already on its way when the user clicked, it lands a moment later
  with the old data and the tick disappears — then reappears, or not.
- When the server rejects a save, the box stays ticked, although the todo isn't done.
- Nothing re-syncs with the server afterwards, so other users' changes never show up.

Finish `useToggleTodo`. The component and `api.ts` are fine as they are.

The tests render `TodoChecklist` with their own `QueryClient` and a fake server that can hold
requests and reject a save. Like a real server, it reads its rows when a GET arrives — so a GET
sent before your write answers with pre-write data.

## Hints

- `onMutate` may be `async`. `await queryClient.cancelQueries({ queryKey: todosKey })` first;
  a cancelled fetch's late response is ignored.
- Take the snapshot (`getQueryData`) **before** the optimistic write, and `return { previous }`.
  `onError` receives that object as its third argument.
- `onSettled` runs after success and after failure. Return
  `queryClient.invalidateQueries({ queryKey: todosKey })` from it.
