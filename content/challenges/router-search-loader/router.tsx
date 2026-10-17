import type { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { postsRoute } from "./postsRoute";
import { rootRoute } from "./rootRoute";

// Code-based routing: the tree is built by hand. (Provided; you don't need to edit this file.)
export const routeTree = rootRoute.addChildren([postsRoute]);

/**
 * A router over an in-memory history, so it runs without a real address bar (the preview and
 * the tests both use it). `defaultPreloadStaleTime: 0` hands freshness decisions to TanStack
 * Query, as the Router docs recommend with an external cache.
 */
export function createAppRouter(queryClient: QueryClient, initialUrl: string) {
  return createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialUrl] }),
    defaultPreloadStaleTime: 0,
  });
}

// Registering the router type is what makes <Link to>, useNavigate and friends type-checked
// against this route tree.
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
