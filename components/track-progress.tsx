"use client";

import { useProgress } from "@/components/progress-provider";

/** Per-track summary bar shown on the home index: N/total units completed. */
export function TrackProgress({ unitIds }: { unitIds: string[] }) {
  const { map, ready } = useProgress();
  const total = unitIds.length;

  // Reserve the row height until the shared read runs, so completed units don't flash 0%.
  if (!ready) return <div className="mt-3 h-4" aria-hidden />;

  const done = unitIds.filter((id) => map[id]?.completed).length;
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
