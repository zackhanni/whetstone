import { useEffect, useState } from "react";

type Props = { description: string };

export function DescriptionEditor({ description }: Props) {
  const [text, setText] = useState(description);
  const [resizes, setResizes] = useState(0);

  // Derived, not state: impossible to desync, no extra render.
  const count = text.length;

  // The only real effect left: one subscription, cleaned up on unmount.
  // (To reset the draft when a DIFFERENT record loads, remount with a key instead of
  // syncing the prop into state here.)
  useEffect(() => {
    const onResize = () => setResizes((r) => r + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div>
      <input
        data-testid="text"
        aria-label="Description"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <p>
        chars: <span data-testid="count">{count}</span>
      </p>
      <p>
        resizes: <span data-testid="resizes">{resizes}</span>
      </p>
    </div>
  );
}
