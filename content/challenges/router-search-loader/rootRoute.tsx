import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, useRouterState } from "@tanstack/react-router";

// The root of the route tree. Every route's loader receives this context, so loaders can
// reach the QueryClient. (Provided; you don't need to edit this file.)
export type RouterContext = { queryClient: QueryClient };

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: function Root() {
    const href = useRouterState({ select: (state) => state.location.href });
    return (
      <div>
        <p style={{ color: "#64748b", fontSize: 13 }}>
          URL: <code data-testid="url">{href}</code>
        </p>
        <Outlet />
      </div>
    );
  },
});
