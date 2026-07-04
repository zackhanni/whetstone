import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  function addThree() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  return (
    <div>
      <p data-testid="count">{count}</p>
      <button onClick={addThree}>Add 3</button>
    </div>
  );
}
