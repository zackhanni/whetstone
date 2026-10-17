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

  return (
    <div>
      <input
        aria-label="search"
        value={query}
        placeholder="Search users…"
        onChange={(e) => {
          // A new search starts in this event, so clear the last one's results and error here
          // (not in the effect): the screen never shows another query's results, and an empty
          // box shows nothing.
          setQuery(e.target.value);
          setResults([]);
          setError(null);
        }}
      />
      {error && <p role="alert">Search failed: {error}</p>}
      <ul>
        {results.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </div>
  );
}
