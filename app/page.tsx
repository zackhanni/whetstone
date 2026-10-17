import type { ReactNode } from "react";
import { listTrackSlugs, loadTrack, type TrackDetail } from "@/lib/content";
import { ContinueLearning, type UnitRef } from "@/components/continue-learning";
import { InterestFilter } from "@/components/interest-filter";
import { TrackCatalog, type CatalogTrack } from "@/components/track-catalog";

const MESSAGE_CLASS = "rounded-xl bg-slate-900/40 p-4 text-sm text-slate-400 ring-1 ring-slate-800";

export default async function Home() {
  const slugs = await listTrackSlugs();
  // No catch: this page is built once (SSG), so skipping a track that fails to load would ship
  // a catalog with that track silently missing. A broken track.json fails the build instead.
  const details: TrackDetail[] = await Promise.all(slugs.map((s) => loadTrack(s)));

  const allUnits: UnitRef[] = details.flatMap((d) =>
    d.units.map((u) => ({
      id: `${d.slug}/${u.slug}`,
      track: d.slug,
      unit: u.slug,
      unitTitle: u.title,
      trackTitle: d.title,
    })),
  );

  // Serializable per-track data for the client catalog. Track tags = deduped union of its units'
  // skills (unit-level is the source of truth).
  const catalogTracks: CatalogTrack[] = details.map((d) => ({
    slug: d.slug,
    title: d.title,
    description: d.description,
    unitCount: d.units.length,
    unitIds: d.units.map((u) => `${d.slug}/${u.slug}`),
    skills: [...new Set(d.units.flatMap((u) => u.skills))], // deduped union (matches CatalogTrack.skills contract)
  }));

  const tracksContent: ReactNode =
    slugs.length === 0 ? (
      <p className={MESSAGE_CLASS}>No tracks yet — check back soon.</p>
    ) : (
      <TrackCatalog tracks={catalogTracks} />
    );

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-50">Whetstone</h1>
        <p className="text-slate-400">Sharpen any skill through deliberate practice.</p>
      </header>

      <ContinueLearning units={allUnits} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracks</h2>
          <InterestFilter />
        </div>
        {tracksContent}
      </section>
    </main>
  );
}
