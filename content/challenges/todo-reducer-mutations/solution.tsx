import type { Action, State, Todo } from "./types";

/** The todo list's reducer: never changes `state`, and returns it untouched for a no-op. */
export function todosReducer(state: State, action: Action): State {
  switch (action.type) {
    case "added": {
      // A new array with the todo appended; the previous state keeps its own array.
      return { ...state, todos: [...state.todos, action.todo] };
    }
    case "toggled": {
      // Nothing to toggle → the same object, so React's Object.is check can skip the re-render.
      if (!state.todos.some((t) => t.id === action.id)) return state;
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
      };
    }
    case "tagged": {
      // Copy every level on the path: the array, the todo, and the todo's tags array.
      return {
        ...state,
        todos: state.todos.map((t) =>
          t.id === action.id ? { ...t, tags: [...t.tags, action.tag] } : t,
        ),
      };
    }
    case "removed": {
      return { ...state, todos: state.todos.filter((t) => t.id !== action.id) };
    }
  }
}

/** The todos in A–Z order, for the sorted view. */
export function selectByTitle(state: State): Todo[] {
  // toSorted (ES2023) returns a sorted copy; sort() would reorder the state's own array.
  return state.todos.toSorted((a, b) => a.title.localeCompare(b.title));
}
