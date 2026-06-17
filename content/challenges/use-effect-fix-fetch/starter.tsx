import { useEffect, useState } from "react";
import { searchUsers, type User } from "./api";

export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);

  // 🐛 BUG: no cleanup and no race guard.
  // - A slow earlier response can overwrite a newer query's results.
  // - The in-flight request is never aborted on query change / unmount.
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
