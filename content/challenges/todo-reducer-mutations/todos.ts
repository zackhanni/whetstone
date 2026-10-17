import type { Action, State, Todo } from "./types";

/**
 * The todo list's reducer and its sorted view. Every case returns a new-looking state, so it seems
 * immutable — but four places change the state they were given, and one makes a needless copy.
 * In the order worth fixing them:
 *   1. "added" pushes into the array the previous state still holds.
 *   2. "toggled" copies the array, then flips `done` on the shared todo object.
 *   3. "tagged" copies the todo, but not its `tags` array, and pushes into that.
 *   4. selectByTitle sorts the state's own array in place.
 *   5. "toggled" with an id that doesn't exist should change nothing — so return the same state.
 */
export function todosReducer(state: State, action: Action): State {
  switch (action.type) {
    case "added": {
      state.todos.push(action.todo);
      return { ...state };
    }
    case "toggled": {
      const todos = [...state.todos];
      const todo = todos.find((t) => t.id === action.id);
      if (todo) todo.done = !todo.done;
      return { ...state, todos };
    }
    case "tagged": {
      return {
        ...state,
        todos: state.todos.map((t) => {
          if (t.id !== action.id) return t;
          const next = { ...t };
          next.tags.push(action.tag);
          return next;
        }),
      };
    }
    case "removed": {
      return { ...state, todos: state.todos.filter((t) => t.id !== action.id) };
    }
  }
}

/** The todos in A–Z order, for the sorted view. */
export function selectByTitle(state: State): Todo[] {
  return state.todos.sort((a, b) => a.title.localeCompare(b.title));
}
