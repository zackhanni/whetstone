import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddTodoForm } from "./AddTodo";
import { TodoList } from "./TodoList";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
        <h3>Todos</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
          Add a todo, double-click Save, and try saving an empty title (the server rejects it).
        </p>
        <AddTodoForm />
        <TodoList />
      </div>
    </QueryClientProvider>
  );
}
