import { useMemo, useState } from "react";
import { createSearchClient, type SearchState } from "./search-client";

// Type quickly: each request takes 100-700 ms at random, so responses come back out of order.
// With a 600 ms deadline, the slowest ones time out too.
export default function App() {
  const client = useMemo(() => createSearchClient({ timeoutMs: 600 }), []);
  const [state, setState] = useState<SearchState>(client.getState());

  const onChange = async (query: string) => {
    if (!query) {
      client.cancel();
      setState(client.getState());
      return;
    }
    const pending = client.search(query);
    setState(client.getState()); // "loading" for the newest query
    await pending;
    setState(client.getState()); // whatever the client now says is current
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <input
        aria-label="search"
        placeholder="Search people…"
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", padding: 6 }}
      />
      <p style={{ fontSize: 13, color: "#64748b" }}>
        query: <code>{JSON.stringify(state.query)}</code> · status: <strong>{state.status}</strong>
        {state.error ? ` · error: ${state.error}` : ""}
      </p>
      <ul>
        {state.results.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  );
}
