import { SearchForm } from "./SearchForm";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>Search</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Type something, click Clear, then type again. The buggy version leaves focus on the
        button, so your next keystrokes go nowhere.
      </p>
      <SearchForm />
    </div>
  );
}
