import { useState } from "react";

export function SearchForm() {
  const [query, setQuery] = useState("");

  // 🐛 BUG: this input should be focused the moment the form mounts, so the user
  // can start typing immediately — but nothing focuses it. Reach for useRef: attach
  // a ref to the <input>, then call .focus() on it in an effect that runs on mount.

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <input
        data-testid="search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  );
}
