import { useEffect, useState } from "react";
import { searchUsers, type User } from "./api";

export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    searchUsers(query, controller.signal)
      .then((users) => {
        setResults(users);
        setError(null);
      })
      .catch((err: Error) => {
        // Our own cleanup cancelled it: expected, ignore it.
        if (err.name === "AbortError") return;
        // A real failure. Rethrowing here would only become an unhandled promise
        // rejection (it never reaches React or an error boundary), so show it instead.
        setError(err.message);
      });
    return () => controller.abort();
  }, [query]);

  // An empty box shows no results and no error. That's derived during render, not set
  // from the effect.
  const visibleResults = query ? results : [];
  const visibleError = query ? error : null;

  return (
    <div>
      <input
        aria-label="search"
        value={query}
        placeholder="Search users…"
        onChange={(e) => setQuery(e.target.value)}
      />
      {visibleError && <p role="alert">Search failed: {visibleError}</p>}
      <ul>
        {visibleResults.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </div>
  );
}
