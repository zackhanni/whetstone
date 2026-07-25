import { useState } from "react";
import { SAVE_DELAY_MS } from "./config";

type Props = { title: string; onCommit: (t: string) => void };

export function EditableTitle({ title, onCommit }: Props) {
  const [text, setText] = useState(title);

  // 🐛 BUG: this saves on EVERY keystroke — typing "Hello" fires five writes.
  //
  // Debounce it:
  //   1. Keep the setTimeout handle in a ref (it must survive re-renders, and changing
  //      it must not re-render).
  //   2. On change: update the text immediately, cancel any pending timer, and schedule
  //      onCommit(value) SAVE_DELAY_MS from now.
  //   3. On blur: cancel the pending timer and commit right away — but only if the text
  //      actually changed.
  //   4. On unmount: clear any pending timer so it can't fire for a gone component.

  return (
    <input
      data-testid="title"
      aria-label="Collection title"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onCommit(e.target.value);
      }}
    />
  );
}

// SAVE_DELAY_MS is imported so you can use it as the debounce delay.
void SAVE_DELAY_MS;
