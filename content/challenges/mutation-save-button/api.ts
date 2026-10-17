export type Todo = { id: number; title: string };

/** The fake server's rows. (Provided; you don't need to edit this file.) */
const ROWS: Todo[] = [
  { id: 1, title: "Buy milk" },
  { id: 2, title: "Walk the dog" },
];

type Impl = {
  todos: () => Promise<Todo[]>;
  create: (title: string) => Promise<Todo>;
};

const latency = () => new Promise((resolve) => setTimeout(resolve, 500));

let impl: Impl = {
  async todos() {
    await latency();
    return ROWS.map((t) => ({ ...t }));
  },
  async create(title) {
    await latency();
    if (title === "") throw new Error("Title can't be empty");
    const todo = { id: Math.max(0, ...ROWS.map((t) => t.id)) + 1, title };
    ROWS.push(todo);
    return { ...todo };
  },
};

/** GET /todos */
export function fetchTodos(): Promise<Todo[]> {
  return impl.todos();
}

/** POST /todos — creates a todo and returns it. Rejects an empty title. */
export function createTodo(title: string): Promise<Todo> {
  return impl.create(title);
}

/**
 * Test seam: lets the grader swap in a fake server it controls, without module mocking
 * (Sandpack's in-browser runner can't do `jest.mock`). Not used by the lesson code.
 */
export function __setImpl(next: Impl): void {
  impl = next;
}
