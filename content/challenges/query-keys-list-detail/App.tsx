import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TodoScreen } from "./TodoScreen";

// One client for the preview, created once at module level so it survives re-renders.
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
        <h3>Todos</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
          Switch filters, then pick a todo. The buggy keys keep showing the first list and the
          first todo you opened.
        </p>
        <TodoScreen />
      </div>
    </QueryClientProvider>
  );
}
