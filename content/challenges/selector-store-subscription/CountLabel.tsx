import { useRef } from "react";
import { useStore } from "./useStore";

// Read-only. It selects only `count`, so it should re-render only when `count` changes.
export function CountLabel() {
  const count = useStore((s) => s.count);
  const inc = useStore((s) => s.inc);

  const renders = useRef(0);
  renders.current += 1;

  return (
    <p>
      count: <span data-testid="count">{count}</span> · renders:{" "}
      <span data-testid="count-renders">{renders.current}</span>{" "}
      <button data-testid="inc" onClick={inc}>
        count +1
      </button>
    </p>
  );
}
