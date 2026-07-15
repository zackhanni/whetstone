"use client";

import Link from "next/link";
import { useProgress } from "@/components/progress-provider";

export type UnitRef = {
  id: string;
  track: string;
  unit: string;
  unitTitle: string;
  trackTitle: string;
};

/** "Continue where you left off": the most recently-touched incomplete unit, else the
 *  first unstarted/incomplete one. Renders nothing until the shared read has run. */
export function ContinueLearning({ units }: { units: UnitRef[] }) {
  const { map, ready } = useProgress();
  if (!ready) return null;

  let resume: UnitRef | null = null;
  let resumeAt = -1;
  let firstIncomplete: UnitRef | null = null;
  for (const u of units) {
    const p = map[u.id];
    if (!firstIncomplete && !p?.completed) firstIncomplete = u;
    if (p?.visited && !p.completed && p.at > resumeAt) {
      resume = u;
      resumeAt = p.at;
    }
  }

  const target = resume ?? firstIncomplete;
  if (!target) return null;
  return (
    <Link
      href={`/learn/${target.track}/${target.unit}`}
      className="block rounded-xl bg-sky-500/10 p-4 ring-1 ring-sky-500/40 transition hover:ring-sky-500"
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-sky-400">
        Continue where you left off
      </div>
      <div className="mt-1 font-semibold text-slate-100">{target.unitTitle}</div>
      <div className="text-xs text-slate-400">{target.trackTitle}</div>
    </Link>
  );
}
