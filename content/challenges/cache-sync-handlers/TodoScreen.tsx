import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTodo, fetchTodos, type Status } from "./api";
import { todoKeys } from "./keys";

// The screen the cache feeds. (Provided; you don't need to edit this file.)

function TodoList({ status, onSelect }: { status: Status; onSelect: (id: number) => void }) {
  const { data, isPending, isError } = useQuery({
    queryKey: todoKeys.list(status),
    queryFn: () => fetchTodos(status),
  });

  if (isPending) return <p data-testid="list-loading">Loading todos…</p>;
  if (isError) return <p role="alert">Couldn't load todos.</p>;
  return (
    <ul data-testid="list">
      {data.map((todo) => (
        <li key={todo.id}>
          <button type="button" onClick={() => onSelect(todo.id)}>
            {todo.title}
          </button>
        </li>
      ))}
    </ul>
  );
}

function TodoDetail({ id }: { id: number }) {
  const { data, isPending, isError } = useQuery({
    queryKey: todoKeys.detail(id),
    queryFn: () => fetchTodo(id),
  });

  if (isPending) return <p data-testid="detail-loading">Loading details…</p>;
  if (isError) return <p role="alert">Couldn't load this todo.</p>;
  return (
    <section data-testid="detail">
      <h4 data-testid="detail-title">{data.title}</h4>
      <p>Status: {data.status}</p>
    </section>
  );
}

export function TodoScreen() {
  const [status, setStatus] = useState<Status>("open");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div>
      <div role="group" aria-label="Filter">
        <button type="button" aria-pressed={status === "open"} onClick={() => setStatus("open")}>
          Open
        </button>
        <button type="button" aria-pressed={status === "done"} onClick={() => setStatus("done")}>
          Done
        </button>
      </div>
      <TodoList status={status} onSelect={setSelectedId} />
      {selectedId !== null && <TodoDetail id={selectedId} />}
    </div>
  );
}
