import { selectByTitle, todosReducer } from "./todos";
import type { State } from "./types";

// A fresh state per test, so one test's mutation can't leak into the next.
const makeState = (): State => ({
  todos: [
    { id: "t1", title: "Write report", done: false, tags: ["work"] },
    { id: "t2", title: "Buy milk", done: false, tags: [] },
  ],
});

describe("todosReducer", () => {
  it("added: returns the new todo without changing the previous state", () => {
    const state = makeState();
    const next = todosReducer(state, {
      type: "added",
      todo: { id: "t3", title: "Call Ada", done: false, tags: [] },
    });
    expect(next.todos.length).toBe(3);
    expect(next.todos[2].id).toBe("t3");
    expect(state.todos.length).toBe(2);
  });

  it("toggled: flips done on a copy, leaving the previous todo as it was", () => {
    const state = makeState();
    const next = todosReducer(state, { type: "toggled", id: "t2" });
    expect(next.todos[1].done).toBe(true);
    expect(state.todos[1].done).toBe(false);
    // Copy only the path to the change: the todo nobody touched stays the same object, which is
    // what lets memo children and selectors skip work. (A deep clone of the state fails here.)
    expect(next.todos[0] === state.todos[0]).toBe(true);
  });

  it("tagged: adds the tag on a copy, leaving the previous todo's tags as they were", () => {
    const state = makeState();
    const next = todosReducer(state, { type: "tagged", id: "t1", tag: "urgent" });
    expect(next.todos[0].tags.join(",")).toBe("work,urgent");
    expect(state.todos[0].tags.join(",")).toBe("work");
  });

  it("removed: drops the todo without changing the previous state", () => {
    const state = makeState();
    const next = todosReducer(state, { type: "removed", id: "t1" });
    expect(next.todos.map((t) => t.id).join(",")).toBe("t2");
    expect(state.todos.length).toBe(2);
  });

  it("toggled with an unknown id returns the very same state object (a no-op)", () => {
    const state = makeState();
    const next = todosReducer(state, { type: "toggled", id: "nope" });
    expect(next === state).toBe(true);
  });
});

describe("selectByTitle", () => {
  it("returns the todos A–Z without reordering the state's own array", () => {
    const state = makeState();
    const sorted = selectByTitle(state);
    expect(sorted.map((t) => t.title).join(",")).toBe("Buy milk,Write report");
    expect(state.todos.map((t) => t.id).join(",")).toBe("t1,t2");
  });
});
