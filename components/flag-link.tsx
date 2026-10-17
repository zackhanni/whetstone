"use client";

import { createContext, useContext } from "react";
import { Flag } from "lucide-react";
import { feedbackIssueUrl } from "@/lib/feedback";

/**
 * The unit being shown, so a FlagLink deep inside a block knows its track and unit without
 * every block component threading two extra props through.
 */
const UnitRefContext = createContext<{ track: string; unit: string } | null>(null);
export const UnitRefProvider = UnitRefContext.Provider;

/** "Flag" — opens a prefilled GitHub issue for one block or item (see lib/feedback.ts). */
export function FlagLink({ block, item }: { block: string; item?: string }) {
  const unitRef = useContext(UnitRefContext);
  if (!unitRef) return null;
  return (
    <a
      href={feedbackIssueUrl({ ...unitRef, block, item })}
      target="_blank"
      rel="noreferrer"
      title="Report a problem with this (opens a GitHub issue)"
      className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
    >
      <Flag aria-hidden className="size-3" />
      Flag
    </a>
  );
}
