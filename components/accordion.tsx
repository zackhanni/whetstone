"use client";

import { useState } from "react";

export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg bg-slate-900/40 ring-1 ring-slate-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-200"
      >
        <span>{title}</span>
        <span className="text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}
