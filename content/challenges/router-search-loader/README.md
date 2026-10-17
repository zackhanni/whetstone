A paged, filterable posts list built on TanStack Router v1 (code-based routes) and TanStack
Query v5. The route validates its search params, its loader puts the page into the query cache
before the page renders, and the component reads it with `useSuspenseQuery`. Three things are
wrong:

- A hand-edited URL like `/posts?page=abc` sends `"abc"` to the API and the page errors.
- Every **Next** flashes *Loading posts…*: the loader doesn't run again, so the component ends
  up fetching by itself.
- On `/posts?page=1&tag=react`, **Next** goes to page 2 of **all** posts — the tag is lost.

Fix `postsRoute.tsx`. The root route, `router.tsx` and `api.ts` are fine as they are.

The tests create the router on an in-memory history at a given URL, with their own
`QueryClient` and a fake server they can pause.

## Hints

- `validateSearch` receives the URL's search params already JSON-parsed (`?page=2` arrives as
  the number `2`, `?page=abc` as the string `"abc"`) and must return the typed search the rest
  of the route sees.
- `loaderDeps: ({ search }) => ({ … })` declares what the loader depends on; the loader then
  reads it from `deps`. When the deps change, the router re-runs the loader.
- `search` on a `Link` can be a function of the previous search:
  `search={(prev) => ({ ...prev, page: prev.page + 1 })}`.
