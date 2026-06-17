import { useEffect, useState } from "react";
import { searchUsers, type User } from "./api";

export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    searchUsers(query, controller.signal)
      .then(setResults)
      .catch((err) => {
        // Ignore the cancellation; surface anything else.
        if ((err as Error).name !== "AbortError") throw err;
      });
    return () => controller.abort();
  }, [query]);

  return (
    <div>
      <input
        aria-label="search"
        value={query}
        placeholder="Search users…"
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul>
        {results.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </div>
  );
}
