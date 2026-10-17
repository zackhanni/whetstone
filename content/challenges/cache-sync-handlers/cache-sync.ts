import type { QueryClient } from "@tanstack/react-query";
import type { Todo } from "./api";
import { todoKeys } from "./keys";

// 🐛 Three bugs; each one has its own failing test. Fix them in this order:
//   1. The list update edits the cached row in place. The cache now holds the new title, but
//      the list on screen never re-renders. Return new data instead of mutating the old.
//   2. The detail is refetched although the push already carries the full, updated todo:
//      the open detail shows the old title until a request finishes. Write it directly.
//   3. A created todo is fetched only into lists that are on screen. A list that's cached but
//      hidden stays "fresh" (the app uses a 60 s staleTime), so when the user switches to it,
//      the new todo is missing. Mark every list stale; fetch only the visible ones now.

/**
 * The server pushed a rename. `todo` is the full, updated row. A rename never changes which
 * list a todo belongs to, or its position in it.
 */
export function onTodoRenamed(queryClient: QueryClient, todo: Todo): void {
  void queryClient.invalidateQueries({ queryKey: todoKeys.detail(todo.id) });

  queryClient.setQueriesData<Todo[]>({ queryKey: todoKeys.lists() }, (old) => {
    const row = old?.find((t) => t.id === todo.id);
    if (row) row.title = todo.title;
    return old;
  });
}

/**
 * The server says someone created a todo. The push doesn't include it, so we don't know which
 * lists it belongs in, or where.
 */
export function onTodoCreated(queryClient: QueryClient): void {
  void queryClient.refetchQueries({ queryKey: todoKeys.lists(), type: "active" });
}
