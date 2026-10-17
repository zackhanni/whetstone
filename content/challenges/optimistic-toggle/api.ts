export type Todo = { id: number; title: string; done: boolean };

/** The fake server's rows. (Provided; you don't need to edit this file.) */
const ROWS: Todo[] = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Walk the dog", done: false },
  { id: 3, title: "File taxes", done: true },
];

type Impl = {
  todos: () => Promise<Todo[]>;
  patch: (id: number, done: boolean) => Promise<Todo>;
};

const latency = () => new Promise((resolve) => setTimeout(resolve, 700));
let patches = 0;

let impl: Impl = {
  async todos() {
    const snapshot = ROWS.map((t) => ({ ...t })); // the server reads its rows when the request arrives
    await latency();
    return snapshot;
  },
  async patch(id, done) {
    patches += 1;
    await latency();
    // Every third save fails, so the preview shows a rollback.
    if (patches % 3 === 0) throw new Error("409 Conflict");
    const row = ROWS.find((t) => t.id === id);
    if (!row) throw new Error(`Todo ${id} not found`);
    row.done = done;
    return { ...row };
  },
};

/** GET /todos */
export function fetchTodos(): Promise<Todo[]> {
  return impl.todos();
}

/** PATCH /todos/:id { done } — returns the updated todo. */
export function patchTodo(id: number, done: boolean): Promise<Todo> {
  return impl.patch(id, done);
}

/**
 * Test seam: lets the grader swap in a fake server it controls, without module mocking
 * (Sandpack's in-browser runner can't do `jest.mock`). Not used by the lesson code.
 */
export function __setImpl(next: Impl): void {
  impl = next;
}
