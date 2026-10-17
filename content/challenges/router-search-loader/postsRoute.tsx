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

// 🐛 Three bugs; each one has its own failing test. Fix them in this order:
//   1. validateSearch trusts the URL. `?page=abc` or `?page=0` reaches the API and the page
//      errors. Fall back to page 1 for anything that isn't a positive integer, and drop a tag
//      that isn't a non-empty string.
//   2. The loader digs the page out of `location.search`, so the router doesn't know the loader
//      depends on it: clicking Next doesn't re-run the loader, and the page component fetches
//      by itself — a loading flash on every page. Declare what the loader reads with loaderDeps
//      and read it from `deps`.
//   3. Next replaces the whole search object, so `?tag=react` is lost on page 2. Update the
//      search from the previous value instead.
export const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "posts",
  validateSearch: (search: Record<string, unknown>): PostsSearch => ({
    page: search.page as number,
    tag: search.tag as string | undefined,
  }),
  loader: ({ context, location }) => {
    const search = location.search as PostsSearch;
    // Cached data if there is any, otherwise fetch — and the router waits for it. (Before Query
    // v5.102 this was `ensureQueryData(options)`, now deprecated.)
    return context.queryClient.query({ ...postsQuery(search), staleTime: "static" });
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
      {data.hasMore && (
        <Link from="/posts" search={{ page: search.page + 1 }}>
          Next
        </Link>
      )}
    </div>
  );
}
