import { useEffect, useState } from "react";
import { searchUsers, type User } from "./api";

export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);

  // 🐛 BUG: no cleanup, no race guard. A slow earlier response can overwrite a newer
  // query's results, and in-flight requests aren't cancelled on query change / unmount.
  // Fix it with AbortController + a cleanup function so the tests pass.
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    searchUsers(query).then(setResults);
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
