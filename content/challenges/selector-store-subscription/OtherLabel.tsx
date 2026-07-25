import { useRef } from "react";
import { useStore } from "./useStore";

// Read-only. It never reads `count`, so incrementing the count must NOT re-render it.
export function OtherLabel() {
  const other = useStore((s) => s.other);
  const bumpOther = useStore((s) => s.bumpOther);

  const renders = useRef(0);
  renders.current += 1;

  return (
    <p>
      other: <span data-testid="other">{other}</span> · renders:{" "}
      <span data-testid="other-renders">{renders.current}</span>{" "}
      <button data-testid="bump" onClick={bumpOther}>
        other +1
      </button>
    </p>
  );
}
