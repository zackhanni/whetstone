"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { matches } from "@/lib/tags";
import { TagChips } from "@/components/tag-chips";
import { TrackProgress } from "@/components/track-progress";
import { useInterestsStore } from "@/lib/stores/interests-store";

export type CatalogTrack = {
  slug: string;
  title: string;
  description: string;
  unitCount: number;
  unitIds: string[];
  skills: string[]; // deduped union of the track's units' skills
};

function TrackCard({ track, dimmed }: { track: CatalogTrack; dimmed?: boolean }) {
  return (
    <Link
      href={`/learn/${track.slug}`}
      className={cn(
        "block rounded-xl bg-slate-900/40 p-4 ring-1 ring-slate-800 transition hover:ring-slate-600",
        dimmed && "opacity-50 hover:opacity-100",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-100">{track.title}</h3>
        <span className="shrink-0 text-xs text-slate-500">
          {track.unitCount} unit{track.unitCount === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{track.description}</p>
      <TagChips skills={track.skills} className="mt-2" />
      <TrackProgress unitIds={track.unitIds} />
    </Link>
  );
}

/**
 * The track list, soft-filtered by the learner's interest tags. Nothing is ever hidden: with a
 * selection active, matching tracks float to the top and the rest drop below a "More tracks"
 * divider, dimmed. Empty selection (or pre-hydration) shows the plain, unfiltered list — so the
 * server render and first client render agree.
 */
export function TrackCatalog({ tracks }: { tracks: CatalogTrack[] }) {
  const selected = useInterestsStore((s) => s.selected);
  const hasHydrated = useInterestsStore((s) => s.hasHydrated);

  if (!hasHydrated || selected.length === 0) {
    return (
      <div className="space-y-3">
        {tracks.map((t) => (
          <TrackCard key={t.slug} track={t} />
        ))}
      </div>
    );
  }

  const matched: CatalogTrack[] = [];
  const rest: CatalogTrack[] = [];
  for (const t of tracks) (matches(t.skills, selected) ? matched : rest).push(t);

  return (
    <div className="space-y-3">
      {matched.map((t) => (
        <TrackCard key={t.slug} track={t} />
      ))}
      {matched.length === 0 && (
        <p className="rounded-xl bg-slate-900/40 p-4 text-sm text-slate-400 ring-1 ring-slate-800">
          No tracks match your filter yet — here&apos;s everything else.
        </p>
      )}
      {rest.length > 0 && (
        <>
          <div className="flex items-center gap-3 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <span>More tracks</span>
            <span className="h-px flex-1 bg-slate-800" />
          </div>
          {rest.map((t) => (
            <TrackCard key={t.slug} track={t} dimmed />
          ))}
        </>
      )}
    </div>
  );
}
