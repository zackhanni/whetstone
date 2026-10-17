import { useQuery } from "@tanstack/react-query";
import { fetchTodos } from "./api";

// The list the form should keep current. (Provided; you don't need to edit this file.)
export const todosKey = ["todos"] as const;

export function TodoList() {
  const { data, isPending, isError } = useQuery({ queryKey: todosKey, queryFn: fetchTodos });

  if (isPending) return <p data-testid="list-loading">Loading todos…</p>;
  if (isError) return <p role="alert">Couldn't load todos.</p>;
  return (
    <ul data-testid="list">
      {data.map((todo) => (
        <li key={todo.id}>{todo.title}</li>
      ))}
    </ul>
  );
}
