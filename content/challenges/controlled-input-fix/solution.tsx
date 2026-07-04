import { useState } from "react";

const FRUITS = ["Apple", "Apricot", "Banana", "Blueberry", "Cherry", "Mango"];

export function SearchList() {
  const [query, setQuery] = useState("");

  const filtered = FRUITS.filter((fruit) =>
    fruit.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <input
        placeholder="Filter fruit…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
