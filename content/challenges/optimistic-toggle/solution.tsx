import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTodos, patchTodo, type Todo } from "./api";

export const todosKey = ["todos"] as const;

export function useToggleTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => patchTodo(id, done),
    onMutate: async ({ id, done }) => {
      // 1. Cancel outgoing refetches, so one that read the server before this click can't land
      //    afterwards and overwrite the optimistic write.
      await queryClient.cancelQueries({ queryKey: todosKey });
      // 2. Snapshot what's on screen now, for the rollback.
      const previous = queryClient.getQueryData<Todo[]>(todosKey);
      // 3. The optimistic write — immutable, so the list re-renders.
      queryClient.setQueryData<Todo[]>(todosKey, (old) =>
        old?.map((todo) => (todo.id === id ? { ...todo, done } : todo)),
      );
      // 4. Whatever onMutate returns reaches onError/onSettled as their third argument.
      return { previous };
    },
    onError: (_error, _variables, onMutateResult) => {
      queryClient.setQueryData(todosKey, onMutateResult?.previous);
    },
    // Success or failure, re-sync with the server. Returned, so the mutation stays pending
    // until the refetch is done. (Since v5.89 the last argument's `context.client` is the same
    // QueryClient, if you'd rather not close over it.)
    onSettled: () => queryClient.invalidateQueries({ queryKey: todosKey }),
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
