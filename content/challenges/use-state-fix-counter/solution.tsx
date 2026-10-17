import { useState } from "react";
import { save } from "./api";

export function Counter() {
  const [count, setCount] = useState(0);

  function addThree() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  async function saveAndAddOne() {
    await save();
    // The updater gets the latest state when React applies it, not this render's snapshot.
    setCount((c) => c + 1);
  }

  return (
    <div>
      <p data-testid="count">{count}</p>
      <button onClick={addThree}>Add 3</button>
      <button onClick={saveAndAddOne}>Save +1</button>
    </div>
  );
}
