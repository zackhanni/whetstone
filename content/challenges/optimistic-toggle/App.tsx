import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TodoChecklist } from "./TodoChecklist";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
        <h3>Checklist</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
          The server takes 0.7 s per request and rejects every third save. Tick a few boxes
          and watch what happens to a rejected one.
        </p>
        <TodoChecklist />
      </div>
    </QueryClientProvider>
  );
}
