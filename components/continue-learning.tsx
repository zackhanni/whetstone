"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadProgress } from "@/lib/progress";

export type UnitRef = {
  id: string;
  track: string;
  unit: string;
  unitTitle: string;
  trackTitle: string;
};

/** "Continue where you left off": the most recently-touched incomplete unit, else the
 *  first unstarted/incomplete one. Renders nothing until the client has read progress. */
export function ContinueLearning({ units }: { units: UnitRef[] }) {
  const [state, setState] = useState<{ target: UnitRef | null; ready: boolean }>({
    target: null,
    ready: false,
  });

  useEffect(() => {
    let resume: UnitRef | null = null;
    let resumeAt = -1;
    let firstIncomplete: UnitRef | null = null;
    for (const u of units) {
      const p = loadProgress(u.id);
      if (!firstIncomplete && !p?.completed) firstIncomplete = u;
      if (p?.visited && !p.completed && p.at > resumeAt) {
        resume = u;
        resumeAt = p.at;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ target: resume ?? firstIncomplete, ready: true });
  }, [units]);

  if (!state.ready || !state.target) return null;
  const t = state.target;
  return (
    <Link
      href={`/learn/${t.track}/${t.unit}`}
      className="block rounded-xl bg-sky-500/10 p-4 ring-1 ring-sky-500/40 transition hover:ring-sky-500"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-sky-400">
        Continue where you left off
      </div>
      <div className="mt-1 font-semibold text-slate-100">{t.unitTitle}</div>
      <div className="text-xs text-slate-400">{t.trackTitle}</div>
    </Link>
  );
}
