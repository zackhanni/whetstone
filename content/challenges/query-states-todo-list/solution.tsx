import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchTodoPage } from "./api";

export function TodoList() {
  const [page, setPage] = useState(1);
  const { data, error, isError, isPending, isFetching, isPlaceholderData, refetch } = useQuery({
    queryKey: ["todos", { page }],
    queryFn: () => fetchTodoPage(page),
    // While page N+1 has no data, keep showing page N (marked as placeholder) instead of
    // dropping back to "pending".
    placeholderData: keepPreviousData,
  });

  // `status` answers "do we have data?": pending means none yet, so this is the only state
  // that gets the full loading screen. A background refetch is `success` + `isFetching`.
  if (isPending) return <p data-testid="loading">Loading todos…</p>;
  // No data and not pending: this key's first load failed. That's the first page, or a page
  // change: the previous page is a placeholder only while the new key is pending, and a failed
  // page 2 lands here with no list to show. Hence a retry, and a way back. A failed *refetch*
  // keeps its data (status "error", data still set) and falls through to the list below.
  if (data === undefined)
    return (
      <div>
        <p role="alert">Couldn't load todos: {error?.message}</p>
        <button type="button" onClick={() => refetch()}>
          Try again
        </button>
        {page > 1 && (
          <button type="button" onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
        )}
      </div>
    );

  return (
    <div>
      <button type="button" onClick={() => refetch()}>
        Refresh
      </button>
      {isFetching && <span data-testid="refreshing"> Refreshing…</span>}
      {isError && <p role="alert">Couldn't refresh: {error.message}. Showing the last loaded list.</p>}

      {data.items.length === 0 ? (
        <p data-testid="empty">No todos.</p>
      ) : (
        <ul data-testid="list" style={{ opacity: isPlaceholderData ? 0.5 : 1 }}>
          {data.items.map((todo) => (
            <li key={todo.id}>{todo.title}</li>
          ))}
        </ul>
      )}

      <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
        Previous
      </button>
      <span data-testid="page"> Page {page} </span>
      {/* While the list is the previous page's placeholder, its hasMore isn't this page's. */}
      <button
        type="button"
        disabled={isPlaceholderData || !data.hasMore}
        onClick={() => setPage((p) => p + 1)}
      >
        Next
      </button>
    </div>
  );
}
