import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TodoList } from "./TodoList";

// The fake server fails every third request. Retries are off here so the preview shows the
// failure instead of quietly retrying it (the default is 3 retries with backoff).
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
        <h3>Todos</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
          Click Refresh a few times, then page through. The buggy list blanks on every fetch and
          throws the list away when a refresh fails.
        </p>
        <TodoList />
      </div>
    </QueryClientProvider>
  );
}
