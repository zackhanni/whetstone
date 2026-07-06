"use client";

import { useEffect, useState } from "react";
import { loadProgress } from "@/lib/progress";

/** Per-track summary bar shown on the home index: N/total units completed. */
export function TrackProgress({ unitIds }: { unitIds: string[] }) {
  const [done, setDone] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(unitIds.filter((id) => loadProgress(id)?.completed).length);
  }, [unitIds]);

  const total = unitIds.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="mt-3 flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs text-slate-500">
        {done}/{total} done
      </span>
    </div>
  );
}
