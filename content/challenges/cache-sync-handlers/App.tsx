import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { demoServer } from "./api";
import { onTodoCreated, onTodoRenamed } from "./cache-sync";
import { TodoScreen } from "./TodoScreen";

// Like the real app: data stays fresh for a minute, so only the handlers refresh the cache.
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } });

let renames = 0;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
        <h3>Todos</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
          The buttons play "another user" on the server and push the event to this tab.
        </p>
        <button
          type="button"
          onClick={() => onTodoRenamed(queryClient, demoServer.rename(1, `Buy milk (v${++renames})`))}
        >
          Server: rename todo 1
        </button>{" "}
        <button
          type="button"
          onClick={() => {
            demoServer.add("Renew passport", "done");
            onTodoCreated(queryClient);
          }}
        >
          Server: add a done todo
        </button>
        <hr />
        <TodoScreen />
      </div>
    </QueryClientProvider>
  );
}
