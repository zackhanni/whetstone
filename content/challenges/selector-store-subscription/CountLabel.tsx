import { Profiler, useRef } from "react";
import { useStore } from "./useStore";

// Read-only. It selects only `count`, so it should re-render only when `count` changes.
export function CountLabel() {
  const count = useStore((s) => s.count);
  const inc = useStore((s) => s.inc);

  // How the count works: React calls a <Profiler>'s `onRender` once per committed render of
  // the tree inside it, so StrictMode's extra development render isn't counted twice. It runs
  // after the DOM update and writes the number straight into the <span>, which React renders
  // empty and never touches.
  const renders = useRef(0);
  const output = useRef<HTMLSpanElement>(null);
  function countRender() {
    renders.current += 1;
    if (output.current) output.current.textContent = String(renders.current);
  }

  return (
    <Profiler id="CountLabel" onRender={countRender}>
      <p>
        count: <span data-testid="count">{count}</span> · renders:{" "}
        <span data-testid="count-renders" ref={output} />{" "}
        <button data-testid="inc" onClick={inc}>
          count +1
        </button>
      </p>
    </Profiler>
  );
}
