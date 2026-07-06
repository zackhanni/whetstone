import { useState } from "react";

const FRUITS = ["Apple", "Apricot", "Banana", "Blueberry", "Cherry", "Mango"];

export function SearchList() {
  const [query, setQuery] = useState("");

  const filtered = FRUITS.filter((fruit) =>
    fruit.toLowerCase().includes(query.toLowerCase())
  );

  // 🐛 BUG: this input sets `value` from state but has no `onChange`, so typing
  // never updates `query` — the field looks frozen and the list never filters.
  // Make it a properly controlled input.
  return (
    <div>
      <input
        aria-label="Filter fruit"
        placeholder="Filter fruit…"
        value={query}
        data-testid="search"
      />
      <ul data-testid="list">
        {filtered.map((fruit) => (
          <li key={fruit}>{fruit}</li>
        ))}
      </ul>
    </div>
  );
}
