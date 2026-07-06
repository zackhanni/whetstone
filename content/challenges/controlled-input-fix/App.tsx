import { SearchList } from "./SearchList";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Fruit search</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Type to filter — the buggy version won&apos;t let you type at all.
      </p>
      <SearchList />
    </div>
  );
}
