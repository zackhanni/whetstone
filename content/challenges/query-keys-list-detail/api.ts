export type Status = "open" | "done";
export type Todo = { id: number; title: string; status: Status };
export type TodoDetail = Todo & { notes: string };

/** The fake server's rows. (Provided; you don't need to edit this file.) */
const ROWS: TodoDetail[] = [
  { id: 1, title: "Buy milk", status: "open", notes: "Oat, not dairy." },
  { id: 2, title: "Walk the dog", status: "open", notes: "Before 9am." },
  { id: 3, title: "File taxes", status: "done", notes: "Filed on the 3rd." },
  { id: 4, title: "Book dentist", status: "done", notes: "Tuesday, 2pm." },
];

type Impl = {
  todos: (status: Status) => Promise<Todo[]>;
  todo: (id: number) => Promise<TodoDetail>;
};

const latency = () => new Promise((resolve) => setTimeout(resolve, 400));

let impl: Impl = {
  async todos(status) {
    await latency();
    return ROWS.filter((t) => t.status === status).map(({ id, title, status }) => ({ id, title, status }));
  },
  async todo(id) {
    await latency();
    const row = ROWS.find((t) => t.id === id);
    if (!row) throw new Error(`Todo ${id} not found`);
    return { ...row };
  },
};

/** GET /todos?status=… — the list rows (no notes). */
export function fetchTodos(status: Status): Promise<Todo[]> {
  return impl.todos(status);
}

/** GET /todos/:id — one todo with its notes. */
export function fetchTodo(id: number): Promise<TodoDetail> {
  return impl.todo(id);
}

/**
 * Test seam: lets the grader swap in a fake server it controls, without module mocking
 * (Sandpack's in-browser runner can't do `jest.mock`). Not used by the lesson code.
 */
export function __setImpl(next: Impl): void {
  impl = next;
}
