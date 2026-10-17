import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTodos, patchTodo, type Todo } from "./api";

export const todosKey = ["todos"] as const;

// 🐛 The tick is optimistic, but the recipe is missing three steps; each one has its own
// failing test. Fix them in this order:
//   1. A refetch that was already in flight when the user clicked lands afterwards with
//      pre-click data and un-ticks the box. Cancel outgoing fetches of the list before writing.
//   2. A failed save leaves the box ticked. Take a snapshot of the list before the optimistic
//      write, hand it from onMutate to onError, and put it back there.
//   3. Nothing re-syncs with the server afterwards, so whatever else changed there never shows
//      up. Invalidate the list once the save has settled — success or failure.
export function useToggleTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => patchTodo(id, done),
    onMutate: ({ id, done }) => {
      queryClient.setQueryData<Todo[]>(todosKey, (old) =>
        old?.map((todo) => (todo.id === id ? { ...todo, done } : todo)),
      );
    },
  });
}

export function TodoChecklist() {
  const { data, isPending, isError } = useQuery({ queryKey: todosKey, queryFn: fetchTodos });
  const toggle = useToggleTodo();

  if (isPending) return <p>Loading todos…</p>;
  if (isError) return <p role="alert">Couldn't load todos.</p>;
  return (
    <div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {data.map((todo) => (
          <li key={todo.id}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggle.mutate({ id: todo.id, done: !todo.done })}
              />{" "}
              {todo.title}
            </label>
          </li>
        ))}
      </ul>
      {toggle.isError && <p role="alert">Couldn't save: {toggle.error.message}</p>}
    </div>
  );
}
