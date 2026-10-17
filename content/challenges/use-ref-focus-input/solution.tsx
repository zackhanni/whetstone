import { useRef, useState } from "react";

export function SearchForm() {
  const [query, setQuery] = useState("");
  // This component's own <input>: each SearchForm on the page gets its own ref.
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    setQuery("");
    // A click can only happen after React has committed the input, so the ref holds the
    // node here. (In the render body it would still be null on the first render.)
    inputRef.current?.focus();
  }

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()}>
      <input
        ref={inputRef}
        data-testid="search"
        aria-label="Search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button type="button" onClick={handleClear}>
        Clear
      </button>
    </form>
  );
}
