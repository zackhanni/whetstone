import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createRoute, Link } from "@tanstack/react-router";
import { fetchPosts } from "./api";
import { rootRoute } from "./rootRoute";

export type PostsSearch = { page: number; tag?: string };

export const postsQuery = (search: PostsSearch) =>
  queryOptions({
    queryKey: ["posts", search],
    queryFn: () => fetchPosts(search),
  });

export const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "posts",
  // The URL is user input. Whatever arrives, hand the rest of the app a valid PostsSearch.
  validateSearch: (search: Record<string, unknown>): PostsSearch => {
    const page = Number(search.page);
    return {
      page: Number.isInteger(page) && page > 0 ? page : 1,
      tag: typeof search.tag === "string" && search.tag !== "" ? search.tag : undefined,
    };
  },
  // Tell the router exactly which search values the loader depends on. When they change, the
  // loader re-runs (and navigation waits for it); other search params don't trigger a reload.
  loaderDeps: ({ search }) => ({ page: search.page, tag: search.tag }),
  loader: ({ context, deps }) => {
    // Cached data if there is any, otherwise fetch — and the router waits for it. (Before Query
    // v5.102 this was `ensureQueryData(options)`, now deprecated.)
    return context.queryClient.query({ ...postsQuery(deps), staleTime: "static" });
  },
  pendingComponent: () => <p data-testid="pending">Loading posts…</p>,
  component: PostsPage,
});

function PostsPage() {
  const search = postsRoute.useSearch();
  const { data } = useSuspenseQuery(postsQuery(search));

  return (
    <div>
      <h4 data-testid="heading">
        Page {search.page}
        {search.tag ? ` · #${search.tag}` : ""}
      </h4>
      <ul data-testid="list">
        {data.items.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
      {/* An updater keeps every other search param (here, the tag) and changes only the page. */}
      {data.hasMore && (
        <Link from="/posts" search={(prev) => ({ ...prev, page: prev.page + 1 })}>
          Next
        </Link>
      )}
    </div>
  );
}
