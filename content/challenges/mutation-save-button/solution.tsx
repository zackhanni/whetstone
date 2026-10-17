import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTodo } from "./api";
import { todosKey } from "./TodoList"; // the list's query key

export function useAddTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => createTodo(title),
    // Hook-level: runs for every caller, even if the calling component has unmounted.
    // RETURNING the promise keeps the mutation pending until the list has refetched, so
    // "Saving…" lasts until the new todo is actually on screen.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: todosKey }),
  });
}

export function AddTodoForm() {
  const [title, setTitle] = useState("");
  const addTodo = useAddTodo();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Call-level: this form's own reaction. It runs after the hook's onSuccess (so after
        // the refetch), and only if the form is still mounted — fine for clearing an input.
        addTodo.mutate(title.trim(), { onSuccess: () => setTitle("") });
      }}
    >
      <input aria-label="New todo" value={title} onChange={(e) => setTitle(e.target.value)} />
      {/* Disabled while pending: a second click can't start a second POST. */}
      <button type="submit" data-testid="save" disabled={addTodo.isPending}>
        {addTodo.isPending ? "Saving…" : "Save"}
      </button>
      {addTodo.isError && <p role="alert">Couldn't save: {addTodo.error.message}</p>}
    </form>
  );
}
