import { useState } from "react";
import { save } from "./api";

export function Counter() {
  const [count, setCount] = useState(0);

  // 🐛 BUG 1: `count` is a fixed snapshot inside this handler (0), so all three calls
  // queue "set to 1" and it only goes up by 1. Make "Add 3" actually add 3.
  function addThree() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  // 🐛 BUG 2: click "Save +1" twice before the first save comes back and the count only
  // goes up by 1. Both clicks ran a handler from the same render, so both read the same
  // `count` after their `await`.
  // Fix order: bug 1, then bug 2. The same change fixes both.
  async function saveAndAddOne() {
    await save();
    setCount(count + 1);
  }

  return (
    <div>
      <p data-testid="count">{count}</p>
      <button onClick={addThree}>Add 3</button>
      <button onClick={saveAndAddOne}>Save +1</button>
    </div>
  );
}
