import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { loadUnit, loadTrack, listUnits } from "@/lib/content";
import { UnitView } from "@/components/unit-view";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, clipDescription, pageMetadata, plainText } from "@/lib/seo";

// Only units returned by generateStaticParams exist; any other path 404s instead of 500ing.
export const dynamicParams = false;

export async function generateStaticParams() {
  return listUnits();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string; unit: string }>;
}) {
  const { track, unit } = await params;
  const bundle = await loadUnit(track, unit);
  // A unit has no summary field; its first objective says what it teaches.
  const lead = plainText(bundle.unit.objectives[0] ?? bundle.unit.title).replace(/[.!?]?$/, ".");
  return pageMetadata({
    title: bundle.unit.title,
    description: clipDescription(`${lead} Part of ${bundle.track.title}.`),
    path: `/learn/${track}/${unit}`,
  });
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ track: string; unit: string }>;
}) {
  const { track, unit } = await params;
  const [bundle, trackDetail] = await Promise.all([
    // No catch: an unknown path 404s before this runs (dynamicParams = false), so a failure
    // here is broken content and should fail the build, not render as a 404.
    loadUnit(track, unit),
    loadTrack(track).catch((e) => {
      // Degrade gracefully (no prev/next links) but surface a malformed sibling unit instead of hiding it.
      console.error(`Failed to load track "${track}" for the lesson footer:`, e);
      return null;
    }),
  ]);

  const units = trackDetail?.units ?? [];
  const idx = units.findIndex((u) => u.slug === unit);
  const prev = idx > 0 ? units[idx - 1] : null;
  const next = idx >= 0 && idx < units.length - 1 ? units[idx + 1] : null;

  return (
    <main>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: bundle.track.title, path: `/learn/${track}` },
          { name: bundle.unit.title, path: `/learn/${track}/${unit}` },
        ])}
      />
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <Link
          href={`/learn/${bundle.track.slug}`}
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300"
        >
          <ChevronLeft className="size-4 shrink-0" aria-hidden />
          {bundle.track.title}
        </Link>
      </div>

      <UnitView bundle={bundle} />

      {/* Keep-going footer: jump to the next/prev lesson without scrolling back up. */}
      <footer className="mx-auto max-w-5xl px-4 pb-12">
        <nav className="max-w-3xl space-y-4 border-t border-slate-800 pt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Keep going
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {prev && (
              <Link
                href={`/learn/${bundle.track.slug}/${prev.slug}`}
                className="rounded-lg bg-slate-900/40 p-3 ring-1 ring-slate-800 transition hover:ring-slate-600"
              >
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <ChevronLeft className="size-3.5" aria-hidden />
                  Previous
                </div>
                <div className="text-sm font-medium text-slate-200">{prev.title}</div>
              </Link>
            )}
            {next && (
              <Link
                href={`/learn/${bundle.track.slug}/${next.slug}`}
                className="rounded-lg bg-slate-900/40 p-3 text-right ring-1 ring-slate-800 transition hover:ring-slate-600 sm:col-start-2"
              >
                <div className="flex items-center justify-end gap-1 text-xs text-slate-400">
                  Next
                  <ChevronRight className="size-3.5" aria-hidden />
                </div>
                <div className="text-sm font-medium text-slate-200">{next.title}</div>
              </Link>
            )}
          </div>
          <Link
            href={`/learn/${bundle.track.slug}`}
            className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
          >
            All {bundle.track.title} units
            <ChevronRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </nav>
      </footer>
    </main>
  );
}
