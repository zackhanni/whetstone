import { Profiler, useRef } from "react";
import { useStore } from "./useStore";

// Read-only. It never reads `count`, so incrementing the count must NOT re-render it.
export function OtherLabel() {
  const other = useStore((s) => s.other);
  const bumpOther = useStore((s) => s.bumpOther);

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
    <Profiler id="OtherLabel" onRender={countRender}>
      <p>
        other: <span data-testid="other">{other}</span> · renders:{" "}
        <span data-testid="other-renders" ref={output} />{" "}
        <button data-testid="bump" onClick={bumpOther}>
          other +1
        </button>
      </p>
    </Profiler>
  );
}
