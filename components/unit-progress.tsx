"use client";

import { useEffect, useState } from "react";
import { loadProgress, type UnitProgress } from "@/lib/progress";

/** Per-unit status shown on the track index: not started / % bar / completed. */
export function UnitProgress({ unitId }: { unitId: string }) {
  const [p, setP] = useState<UnitProgress | null>(null);
  useEffect(() => {
    // Client-only read (localStorage): nothing on the server + first render, then hydrate.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setP(loadProgress(unitId));
  }, [unitId]);

  if (!p?.visited) {
    return <span className="text-xs text-slate-600">Not started</span>;
  }
  if (p.completed) {
    return <span className="text-xs font-medium text-emerald-400">✓ Completed</span>;
  }
  const pct = p.total > 0 ? Math.round((p.answered / p.total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500">{pct}%</span>
    </div>
  );
}
