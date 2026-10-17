import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { createAppRouter } from "./router";

const queryClient = new QueryClient();
// The preview has no address bar of its own, so the router runs on an in-memory history.
const router = createAppRouter(queryClient, "/posts?page=1&tag=react");

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
        <h3>Posts</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 0 }}>
          Click Next and watch the URL. Then try a hand-edited URL:{" "}
          <button type="button" onClick={() => router.history.push("/posts?page=abc")}>
            ?page=abc
          </button>
        </p>
        <RouterProvider router={router} />
      </div>
    </QueryClientProvider>
  );
}
