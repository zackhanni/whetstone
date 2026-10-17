import { useState } from "react";

export function SearchForm() {
  const [query, setQuery] = useState("");

  // 🐛 BUG: "Clear" empties the box, but focus stays on the Clear button, so the user has
  // to click back into the input before typing the next search. Clear should put focus
  // back in the input. (`autoFocus` won't help: it focuses on mount, and this input is
  // already mounted.)
  //
  // Fix order: 1. get hold of this form's own <input> DOM node with a ref.
  //            2. focus that node from the Clear handler.
  function handleClear() {
    setQuery("");
  }

  return (
    <form role="search" onSubmit={(e) => e.preventDefault()}>
      <input
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
