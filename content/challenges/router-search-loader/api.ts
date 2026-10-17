export type Post = { id: number; title: string; tag: string };
export type PostsPage = { items: Post[]; hasMore: boolean };

export const PAGE_SIZE = 2;

/** The fake server's rows. (Provided; you don't need to edit this file.) */
const ROWS: Post[] = [
  { id: 1, title: "Query keys, explained", tag: "react" },
  { id: 2, title: "Ten CSS tricks", tag: "css" },
  { id: 3, title: "Mutations in practice", tag: "react" },
  { id: 4, title: "Grid vs flexbox", tag: "css" },
  { id: 5, title: "Optimistic updates", tag: "react" },
  { id: 6, title: "Typed routes", tag: "react" },
  { id: 7, title: "Container queries", tag: "css" },
];

/** What the API does with a request — shared by the preview's server and the tests'. */
export function answer(rows: Post[], page: unknown, tag: unknown): PostsPage {
  if (typeof page !== "number" || !Number.isInteger(page) || page < 1) {
    throw new Error(`400 Bad Request: page must be a positive integer, got ${JSON.stringify(page)}`);
  }
  const matching = typeof tag === "string" ? rows.filter((p) => p.tag === tag) : rows;
  const start = (page - 1) * PAGE_SIZE;
  return { items: matching.slice(start, start + PAGE_SIZE), hasMore: start + PAGE_SIZE < matching.length };
}

let impl = async (search: { page: number; tag?: string }): Promise<PostsPage> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return answer(ROWS, search.page, search.tag);
};

/** GET /posts?page=…&tag=… */
export function fetchPosts(search: { page: number; tag?: string }): Promise<PostsPage> {
  return impl(search);
}

/**
 * Test seam: lets the grader swap in a fake server it controls, without module mocking
 * (Sandpack's in-browser runner can't do `jest.mock`). Not used by the lesson code.
 */
export function __setImpl(next: typeof impl): void {
  impl = next;
}
