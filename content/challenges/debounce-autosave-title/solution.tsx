import { useEffect, useRef, useState } from "react";
import { SAVE_DELAY_MS } from "./config";

type Props = { title: string; onCommit: (t: string) => void };

export function EditableTitle({ title, onCommit }: Props) {
  const [text, setText] = useState(title);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // What we last SAVED — not what the prop says. The parent may persist asynchronously or
  // never round-trip `title`, so comparing against the prop would double-save on blur.
  const lastCommitted = useRef(title);

  const commit = (value: string): void => {
    if (value === lastCommitted.current) return;
    lastCommitted.current = value;
    onCommit(value);
  };

  const cancelPending = (): void => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
  };

  const scheduleCommit = (value: string): void => {
    cancelPending();
    timer.current = setTimeout(() => {
      timer.current = undefined; // it fired; there's nothing left to cancel
      commit(value);
    }, SAVE_DELAY_MS);
  };

  // Drop a pending save when the field goes away.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <input
      data-testid="title"
      aria-label="Collection title"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        scheduleCommit(e.target.value);
      }}
      onBlur={() => {
        cancelPending();
        commit(text);
      }}
    />
  );
}
