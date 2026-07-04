import { SearchForm } from "./SearchForm";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Search</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        The input should be focused on load — the buggy version isn&apos;t.
      </p>
      <SearchForm />
    </div>
  );
}
