/** Read-only support file: the todo list's state and the actions its reducer handles. */
export type Todo = { id: string; title: string; done: boolean; tags: string[] };

export type State = { todos: Todo[] };

export type Action =
  | { type: "added"; todo: Todo }
  | { type: "toggled"; id: string }
  | { type: "tagged"; id: string; tag: string }
  | { type: "removed"; id: string };
