import Link from "next/link";
import type { ReactNode } from "react";
import { listTrackSlugs, loadTrack, type TrackDetail } from "@/lib/content";
import { ContinueLearning, type UnitRef } from "@/components/continue-learning";
import { TrackProgress } from "@/components/track-progress";
import { TagChips } from "@/components/tag-chips";

const MESSAGE_CLASS = "rounded-xl bg-slate-900/40 p-4 text-sm text-slate-400 ring-1 ring-slate-800";

export default async function Home() {
  const slugs = await listTrackSlugs();
  // Skip a track whose content fails to load rather than failing the whole page (parity with
  // the old listTracks() filtering); each track.json is parsed once, via loadTrack.
  const details = (await Promise.all(slugs.map((s) => loadTrack(s).catch(() => null)))).filter(
    (d): d is TrackDetail => d !== null,
  );

  const allUnits: UnitRef[] = details.flatMap((d) =>
    d.units.map((u) => ({
      id: `${d.slug}/${u.slug}`,
      track: d.slug,
      unit: u.slug,
      unitTitle: u.title,
      trackTitle: d.title,
    })),
  );

  // Distinguish "no tracks authored" from "tracks exist but none loaded" without layering
  // ternaries (see AGENTS.md → Patterns to avoid).
  let tracksContent: ReactNode;
  if (slugs.length === 0) {
    tracksContent = <p className={MESSAGE_CLASS}>No tracks yet — check back soon.</p>;
  } else if (details.length === 0) {
    tracksContent = (
      <p className={MESSAGE_CLASS}>Tracks are temporarily unavailable — please try again later.</p>
    );
  } else {
    tracksContent = details.map((d) => (
      <Link
        key={d.slug}
        href={`/learn/${d.slug}`}
        className="block rounded-xl bg-slate-900/40 p-4 ring-1 ring-slate-800 transition hover:ring-slate-600"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-100">{d.title}</h3>
          <span className="shrink-0 text-xs text-slate-500">
            {d.units.length} unit{d.units.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">{d.description}</p>
        {/* Track tags = deduped union of its units' skills (unit-level is the source of truth). */}
        <TagChips skills={d.units.flatMap((u) => u.skills)} className="mt-2" />
        <TrackProgress unitIds={d.units.map((u) => `${d.slug}/${u.slug}`)} />
      </Link>
    ));
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-50">Whetstone</h1>
        <p className="text-slate-400">Sharpen any skill through deliberate practice.</p>
      </header>

      <ContinueLearning units={allUnits} />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracks</h2>
        {tracksContent}
      </section>
    </main>
  );
}
