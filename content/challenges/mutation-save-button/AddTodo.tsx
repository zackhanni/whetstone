import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createTodo } from "./api";
import { todosKey } from "./TodoList"; // the list's query key

// 🐛 Three bugs; each one has its own failing test. Fix them in this order:
//   1. The list never shows the new todo: nothing tells the cache that ["todos"] changed.
//      Do it in the hook, so EVERY caller of useAddTodo refreshes the list — and make the
//      mutation stay pending until that refetch has finished (the button should stay disabled
//      until the new todo is on screen).
//   2. Clicking Save again while a save is running sends a second POST: the button is never
//      disabled.
//   3. The input is cleared the moment you click, so a failed save throws away what the user
//      typed. Clear it only once the save has succeeded — that's this form's business, not the
//      hook's.

export function useAddTodo() {
  return useMutation({
    mutationFn: (title: string) => createTodo(title),
  });
}

export function AddTodoForm() {
  const [title, setTitle] = useState("");
  const addTodo = useAddTodo();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        addTodo.mutate(title.trim());
        setTitle("");
      }}
    >
      <input aria-label="New todo" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit" data-testid="save">
        {addTodo.isPending ? "Saving…" : "Save"}
      </button>
      {addTodo.isError && <p role="alert">Couldn't save: {addTodo.error.message}</p>}
    </form>
  );
}
