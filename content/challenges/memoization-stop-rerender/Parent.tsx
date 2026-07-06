import { useState } from "react";
import { Child } from "./Child";

export function Parent() {
  const [ticks, setTicks] = useState(0);
  const [lastClicked, setLastClicked] = useState("none");

  // 🐛 BUG: `handleChildClick` is re-created on every Parent render, so it has a
  // brand-new identity each time. The memo()'d <Child> shallow-compares its props,
  // sees a "different" onClick, and re-renders on EVERY "Tick" — even though nothing
  // the child cares about changed. Give the callback a stable identity so the child
  // re-renders only when it must.
  function handleChildClick(label: string) {
    setLastClicked(label);
  }

  return (
    <div>
      <p data-testid="ticks">ticks: {ticks}</p>
      <p data-testid="last-clicked">last clicked: {lastClicked}</p>
      <button onClick={() => setTicks((t) => t + 1)}>Tick</button>
      <Child onClick={handleChildClick} />
    </div>
  );
}
