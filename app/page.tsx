import { listTrackSlugs, loadTrack, type TrackDetail } from "@/lib/content";
import { unitProgressId } from "@/lib/progress";
import { ContinueLearning, type UnitLink } from "@/components/continue-learning";
import { InterestFilter } from "@/components/interest-filter";
import { TrackCatalog, type CatalogTrack } from "@/components/track-catalog";
import { JsonLd } from "@/components/json-ld";
import { pageMetadata, SITE_DESCRIPTION, websiteJsonLd } from "@/lib/seo";

export const metadata = pageMetadata({ description: SITE_DESCRIPTION, path: "/" });

export default async function Home() {
  const slugs = await listTrackSlugs();
  // No catch: this page is built once (SSG), so skipping a track that fails to load would ship
  // a catalog with that track silently missing. A broken track.json fails the build instead.
  const details: TrackDetail[] = await Promise.all(slugs.map((s) => loadTrack(s)));

  const allUnits: UnitLink[] = details.flatMap((d) =>
    d.units.map((u) => ({
      id: unitProgressId(d.slug, u.slug),
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
    unitIds: d.units.map((u) => unitProgressId(d.slug, u.slug)),
    skills: [...new Set(d.units.flatMap((u) => u.skills))],
  }));

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <JsonLd data={websiteJsonLd()} />
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-50">Whetstone</h1>
        <p className="text-slate-400">Sharpen any skill through deliberate practice.</p>
      </header>

      <ContinueLearning units={allUnits} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tracks</h2>
          <InterestFilter />
        </div>
        <TrackCatalog tracks={catalogTracks} />
      </section>
    </main>
  );
}
