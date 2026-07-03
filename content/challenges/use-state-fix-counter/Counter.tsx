import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  // 🐛 BUG: `count` is a fixed snapshot inside this handler, so all three calls
  // set the same value and it only goes up by 1. Make "Add 3" actually add 3.
  function addThree() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  return (
    <div>
      <p data-testid="count">{count}</p>
      <button onClick={addThree}>Add 3</button>
    </div>
  );
}
