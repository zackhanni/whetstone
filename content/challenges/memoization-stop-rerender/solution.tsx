import { useCallback, useState } from "react";
import { Child } from "./Child";

export function Parent() {
  const [ticks, setTicks] = useState(0);
  const [lastClicked, setLastClicked] = useState("none");

  // ✅ FIX: useCallback returns the same function reference across renders (its deps
  // never change), so the memo()'d <Child> sees an unchanged `onClick` prop and skips
  // re-rendering when only `ticks` updates. setLastClicked is stable, so deps are [].
  const handleChildClick = useCallback((label: string) => {
    setLastClicked(label);
  }, []);

  return (
    <div>
      <p data-testid="ticks">ticks: {ticks}</p>
      <p data-testid="last-clicked">last clicked: {lastClicked}</p>
      <button onClick={() => setTicks((t) => t + 1)}>Tick</button>
      <Child onClick={handleChildClick} />
    </div>
  );
}
