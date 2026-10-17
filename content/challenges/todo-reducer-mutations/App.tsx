import { StrictMode, useReducer, useRef, useState } from "react";
import { selectByTitle, todosReducer } from "./todos";
import type { State } from "./types";

const initial: State = {
  todos: [
    { id: "t1", title: "Write report", done: false, tags: ["work"] },
    { id: "t2", title: "Buy milk", done: false, tags: [] },
  ],
};

function TodoList() {
  const [state, dispatch] = useReducer(todosReducer, initial);
  const [sortedView, setSortedView] = useState(false);
  const nextId = useRef(3);
  const shown = sortedView ? selectByTitle(state) : state.todos;

  const add = () => {
    const id = `t${nextId.current++}`;
    dispatch({ type: "added", todo: { id, title: `Todo ${id}`, done: false, tags: [] } });
  };

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, padding: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={add}>Add</button>
        <button onClick={() => setSortedView((v) => !v)}>{sortedView ? "Insertion order" : "A–Z"}</button>
      </div>
      <ul>
        {shown.map((t) => (
          <li key={t.id}>
            <label>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => dispatch({ type: "toggled", id: t.id })}
              />{" "}
              {t.title} {t.tags.length > 0 && <small>[{t.tags.join(", ")}]</small>}
            </label>{" "}
            <button onClick={() => dispatch({ type: "tagged", id: t.id, tag: "urgent" })}>tag</button>{" "}
            <button onClick={() => dispatch({ type: "removed", id: t.id })}>remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// StrictMode calls reducers twice in development: a mutating reducer shows its bugs right here.
export default function App() {
  return (
    <StrictMode>
      <TodoList />
    </StrictMode>
  );
}
