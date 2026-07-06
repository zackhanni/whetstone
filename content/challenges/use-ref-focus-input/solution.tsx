import { useEffect, useRef, useState } from "react";

export function SearchForm() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <input
        ref={inputRef}
        data-testid="search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  );
}
