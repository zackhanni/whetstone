import { useEffect, useState } from "react";

type Props = { description: string };

export function DescriptionEditor({ description }: Props) {
  const [text, setText] = useState(description);
  const [count, setCount] = useState(0);
  const [resizes, setResizes] = useState(0);

  // 🐛 EFFECT 1 — derived state with the wrong deps. `count` is just text.length.
  useEffect(() => {
    setCount(text.length);
  }, []);

  // 🐛 EFFECT 2 — prop → state sync with NO dependency array, so it runs after every
  // render and overwrites whatever the user typed.
  useEffect(() => {
    setText(description);
  });

  // 🐛 EFFECT 3 — a real subscription, but with no deps and no cleanup: it adds another
  // listener on every render and never removes one.
  useEffect(() => {
    window.addEventListener("resize", () => setResizes((r) => r + 1));
  });

  // Fix order: derive what can be derived → delete what shouldn't exist →
  // give the remaining subscription a named handler, a cleanup, and [] deps.

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
