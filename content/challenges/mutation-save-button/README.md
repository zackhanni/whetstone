`useAddTodo` wraps a `useMutation` that POSTs a new todo, and `AddTodoForm` uses it. Support
tickets:

- "I added a todo and it never showed up — until I reloaded."
- "I double-clicked Save and got the todo twice."
- "The save failed and my text was gone."

Fix the hook and the form. `TodoList.tsx` (the list and its query key) and `api.ts` are fine as
they are.

The tests render the form and the list with their own `QueryClient` and a fake server whose
requests they can pause or fail. One test calls `useAddTodo` from a different component, so the
list refresh has to live in the hook.

## Hints

- After a successful write, `queryClient.invalidateQueries({ queryKey: todosKey })` marks the
  list stale and refetches it. Get the client with `useQueryClient()` inside the hook.
- If `onSuccess` **returns** that promise, the mutation stays `isPending` until the refetch has
  finished. Without the `return`, it's success as soon as the POST is.
- Callbacks passed to `mutate(variables, { onSuccess })` run after the hook's own, and only while
  the component is mounted — the right place for "clear this input".
