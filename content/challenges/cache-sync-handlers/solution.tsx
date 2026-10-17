import type { QueryClient } from "@tanstack/react-query";
import type { Todo } from "./api";
import { todoKeys } from "./keys";

/**
 * The server pushed a rename. `todo` is the full, updated row. A rename never changes which
 * list a todo belongs to, or its position in it.
 */
export function onTodoRenamed(queryClient: QueryClient, todo: Todo): void {
  // We hold the exact new value for this key: write it. No request, and the open detail
  // re-renders at once.
  queryClient.setQueryData(todoKeys.detail(todo.id), todo);

  // Patch the row in every cached list — on screen or not — with a NEW array and a NEW row,
  // so components reading `data` see a changed reference and re-render. Entries with no data
  // yet get `undefined` back, which leaves them untouched.
  queryClient.setQueriesData<Todo[]>({ queryKey: todoKeys.lists() }, (old) =>
    old?.map((t) => (t.id === todo.id ? { ...t, title: todo.title } : t)),
  );
}

/**
 * The server says someone created a todo. The push doesn't include it, so we don't know which
 * lists it belongs in, or where.
 */
export function onTodoCreated(queryClient: QueryClient): void {
  // Marks every list stale (overriding staleTime) and refetches only the ones on screen; a
  // hidden list refetches when it's shown again.
  void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
}
