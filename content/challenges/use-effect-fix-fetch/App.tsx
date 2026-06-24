import { SearchUsers } from "./SearchUsers";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h3>User search</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
        Type quickly and watch the list — the buggy version can flash stale results.
      </p>
      <SearchUsers />
    </div>
  );
}
