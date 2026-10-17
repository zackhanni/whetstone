import { useEffect, useState } from "react";
import { searchUsers, type User } from "./api";

export function SearchUsers() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);

  // 🐛 BUGS: no cleanup, no race guard, no error handling. A slow earlier response can
  // overwrite a newer query's results, in-flight requests aren't cancelled on query change
  // or unmount, and a failed request is never caught, so the user sees nothing.
  // Fix order:
  //   1. Give each run an AbortController, pass its signal to searchUsers, and abort it in
  //      the effect's cleanup. (An aborted request rejects, so it can't set results either.)
  //   2. Catch the rejection. An AbortError is your own cleanup: ignore it. Anything else is
  //      a real failure: keep it in state and render it in an element with role="alert".
  //      (Rethrowing inside .catch only makes an unhandled promise rejection; it never
  //      reaches React or an error boundary.)
  useEffect(() => {
    if (!query) return;
    searchUsers(query).then(setResults);
  }, [query]);

  // An empty box shows no results. That's derived during render, not set from the effect.
  const visibleResults = query ? results : [];

  return (
    <div>
      <input
        aria-label="search"
        value={query}
        placeholder="Search users…"
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul>
        {visibleResults.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </div>
  );
}
