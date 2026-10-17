export type Todo = { id: number; title: string };
export type TodoPage = { items: Todo[]; hasMore: boolean };

export const PAGE_SIZE = 2;

/** The fake server's rows. (Provided; you don't need to edit this file.) */
const ROWS: Todo[] = [
  { id: 1, title: "Buy milk" },
  { id: 2, title: "Walk the dog" },
  { id: 3, title: "File taxes" },
  { id: 4, title: "Book dentist" },
  { id: 5, title: "Call mum" },
];

let requests = 0;

let impl = async (page: number): Promise<TodoPage> => {
  requests += 1;
  await new Promise((resolve) => setTimeout(resolve, 600));
  // Every third request fails, so the preview shows what an error looks like.
  if (requests % 3 === 0) throw new Error("503 Service Unavailable");
  const start = (page - 1) * PAGE_SIZE;
  return { items: ROWS.slice(start, start + PAGE_SIZE), hasMore: start + PAGE_SIZE < ROWS.length };
};

/** GET /todos?page=… */
export function fetchTodoPage(page: number): Promise<TodoPage> {
  return impl(page);
}

/**
 * Test seam: lets the grader swap in a fake server it controls, without module mocking
 * (Sandpack's in-browser runner can't do `jest.mock`). Not used by the lesson code.
 */
export function __setImpl(next: (page: number) => Promise<TodoPage>): void {
  impl = next;
}
