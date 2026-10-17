export type Status = "open" | "done";
export type Todo = { id: number; title: string; status: Status };

/** The fake server's rows. (Provided; you don't need to edit this file.) */
const ROWS: Todo[] = [
  { id: 1, title: "Buy milk", status: "open" },
  { id: 2, title: "Walk the dog", status: "open" },
  { id: 3, title: "File taxes", status: "done" },
];

type Impl = {
  todos: (status: Status) => Promise<Todo[]>;
  todo: (id: number) => Promise<Todo>;
};

const latency = () => new Promise((resolve) => setTimeout(resolve, 400));

let impl: Impl = {
  async todos(status) {
    await latency();
    return ROWS.filter((t) => t.status === status).map((t) => ({ ...t }));
  },
  async todo(id) {
    await latency();
    const row = ROWS.find((t) => t.id === id);
    if (!row) throw new Error(`Todo ${id} not found`);
    return { ...row };
  },
};

/** GET /todos?status=… */
export function fetchTodos(status: Status): Promise<Todo[]> {
  return impl.todos(status);
}

/** GET /todos/:id */
export function fetchTodo(id: number): Promise<Todo> {
  return impl.todo(id);
}

/** What other users do on the server — the preview's buttons call these. */
export const demoServer = {
  rename(id: number, title: string): Todo {
    const row = ROWS.find((t) => t.id === id);
    if (!row) throw new Error(`Todo ${id} not found`);
    row.title = title;
    return { ...row };
  },
  add(title: string, status: Status): void {
    ROWS.push({ id: Math.max(...ROWS.map((t) => t.id)) + 1, title, status });
  },
};

/**
 * Test seam: lets the grader swap in a fake server it controls, without module mocking
 * (Sandpack's in-browser runner can't do `jest.mock`). Not used by the lesson code.
 */
export function __setImpl(next: Impl): void {
  impl = next;
}
