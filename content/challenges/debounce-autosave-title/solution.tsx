import { useEffect, useRef, useState } from "react";
import { SAVE_DELAY_MS } from "./config";

type Props = { title: string; onCommit: (t: string) => void };

export function EditableTitle({ title, onCommit }: Props) {
  const [text, setText] = useState(title);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scheduleCommit = (value: string): void => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onCommit(value), SAVE_DELAY_MS);
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
        if (timer.current) clearTimeout(timer.current);
        if (text !== title) onCommit(text);
      }}
    />
  );
}
