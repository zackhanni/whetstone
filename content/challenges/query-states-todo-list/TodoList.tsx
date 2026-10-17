import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTodoPage } from "./api";

// 🐛 Three bugs; each one has its own failing test. Fix them in this order:
//   1. The loading gate blanks the list on EVERY fetch, including a background refetch,
//      even though the data is still in the cache. Gate on "no data yet" instead.
//   2. A failed refetch replaces the list with an error, although the old data is still
//      there. Only a query with no data at all should show the error panel; with data, show
//      the list plus a banner.
//   3. "Next" swaps the list for a loading state, because each page is a new cache entry
//      with no data. Keep the previous page on screen while the next one loads, and disable
//      "Next" until the real page has arrived.
export function TodoList() {
  const [page, setPage] = useState(1);
  const { data, error, isError, isFetching, refetch } = useQuery({
    queryKey: ["todos", { page }],
    queryFn: () => fetchTodoPage(page),
  });

  if (isFetching) return <p data-testid="loading">Loading todos…</p>;
  if (isError) return <p role="alert">Couldn't load todos: {error.message}</p>;
  if (data === undefined) return null;

  return (
    <div>
      <button type="button" onClick={() => refetch()}>
        Refresh
      </button>
      {isFetching && <span data-testid="refreshing"> Refreshing…</span>}

      {data.items.length === 0 ? (
        <p data-testid="empty">No todos.</p>
      ) : (
        <ul data-testid="list">
          {data.items.map((todo) => (
            <li key={todo.id}>{todo.title}</li>
          ))}
        </ul>
      )}

      <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
        Previous
      </button>
      <span data-testid="page"> Page {page} </span>
      <button type="button" disabled={!data.hasMore} onClick={() => setPage((p) => p + 1)}>
        Next
      </button>
    </div>
  );
}
