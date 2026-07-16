"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";
import { childrenOf, dimensions, labelOf } from "@/lib/tags";
import { useInterestsStore } from "@/lib/stores/interests-store";

const SHEET =
  "fixed inset-y-0 right-0 z-50 flex w-[min(22rem,92vw)] flex-col gap-4 overflow-y-auto bg-slate-950 p-5 ring-1 ring-slate-800 " +
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right";

/**
 * One row of the tag tree. Expand (the caret) and select (the chip) are deliberately SEPARATE
 * controls: tapping the caret reveals children without selecting; tapping the chip toggles the
 * tag. That's what lets a learner drill to `useEffect` and select only it, never selecting `react`.
 */
function TagBranch({ slug, depth }: { slug: string; depth: number }) {
  const [open, setOpen] = useState(depth === 0); // top-level dimensions start expanded
  const selected = useInterestsStore((s) => s.selected.includes(slug));
  const toggle = useInterestsStore((s) => s.toggle);
  const kids = childrenOf(slug);

  return (
    <li>
      <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 14 }}>
        {kids.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${labelOf(slug)}`}
            className="grid size-5 shrink-0 place-items-center rounded text-slate-500 hover:text-slate-300"
          >
            <span className={cn("transition-transform", open && "rotate-90")} aria-hidden>
              ▸
            </span>
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => toggle(slug)}
          aria-pressed={selected}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition",
            selected
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/50"
              : "bg-slate-800/60 text-slate-300 ring-slate-700 hover:ring-slate-500",
          )}
        >
          {labelOf(slug)}
        </button>
      </div>
      {open && kids.length > 0 && (
        <ul className="mt-1.5 space-y-1.5">
          {kids.map((k) => (
            <TagBranch key={k} slug={k} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The "Filter what I want to learn" trigger + slide-in sheet holding the tag tree. */
export function InterestFilter() {
  const count = useInterestsStore((s) => s.selected.length);
  const hasHydrated = useInterestsStore((s) => s.hasHydrated);
  const clear = useInterestsStore((s) => s.clear);
  // Only show the count once hydrated — the server renders 0, and reading persisted state during
  // the first client render would mismatch.
  const badge = hasHydrated && count > 0 ? ` · ${count}` : "";

  return (
    <Dialog.Root>
      <Dialog.Trigger className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 transition hover:ring-slate-500">
        Filter interests{badge}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
        <Dialog.Content className={SHEET} aria-describedby="interest-filter-desc">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <Dialog.Title className="text-sm font-semibold text-slate-100">
                Filter what I want to learn
              </Dialog.Title>
              <Dialog.Description id="interest-filter-desc" className="text-xs text-slate-500">
                Pick a broad tag for everything under it, or drill in for something specific.
                Expanding (▸) doesn&apos;t select — tap a tag to select it.
              </Dialog.Description>
            </div>
            <Dialog.Close className="text-slate-500 hover:text-slate-300" aria-label="Close">
              ✕
            </Dialog.Close>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{hasHydrated && count > 0 ? `${count} selected` : "Nothing selected — showing everything"}</span>
            <button
              type="button"
              onClick={clear}
              disabled={!hasHydrated || count === 0}
              className="rounded px-2 py-1 text-slate-400 enabled:hover:text-slate-200 disabled:opacity-40"
            >
              Clear all
            </button>
          </div>

          <ul className="space-y-1.5">
            {dimensions().map((slug) => (
              <TagBranch key={slug} slug={slug} depth={0} />
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
