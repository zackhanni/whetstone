import { notFound } from "next/navigation";
import Link from "next/link";
import { loadUnit, loadTrack, listUnits } from "@/lib/content";
import { UnitView } from "@/components/unit-view";

// Only units returned by generateStaticParams exist; any other path 404s instead of 500ing.
export const dynamicParams = false;

export async function generateStaticParams() {
  return listUnits();
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ track: string; unit: string }>;
}) {
  const { track, unit } = await params;
  const [bundle, trackDetail] = await Promise.all([
    loadUnit(track, unit).catch(() => notFound()),
    loadTrack(track).catch(() => null),
  ]);

  const units = trackDetail?.units ?? [];
  const idx = units.findIndex((u) => u.slug === unit);
  const prev = idx > 0 ? units[idx - 1] : null;
  const next = idx >= 0 && idx < units.length - 1 ? units[idx + 1] : null;

  return (
    <main>
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <Link
          href={`/learn/${bundle.track.slug}`}
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          ← {bundle.track.title}
        </Link>
      </div>

      <UnitView bundle={bundle} />

      {/* Keep-going footer: jump to the next/prev lesson without scrolling back up. */}
      <footer className="mx-auto max-w-5xl px-4 pb-12">
        <nav className="max-w-3xl space-y-4 border-t border-slate-800 pt-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Keep going
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {prev && (
              <Link
                href={`/learn/${bundle.track.slug}/${prev.slug}`}
                className="rounded-lg bg-slate-900/40 p-3 ring-1 ring-slate-800 transition hover:ring-slate-600"
              >
                <div className="text-xs text-slate-500">← Previous</div>
                <div className="text-sm font-medium text-slate-200">{prev.title}</div>
              </Link>
            )}
            {next && (
              <Link
                href={`/learn/${bundle.track.slug}/${next.slug}`}
                className="rounded-lg bg-slate-900/40 p-3 text-right ring-1 ring-slate-800 transition hover:ring-slate-600 sm:col-start-2"
              >
                <div className="text-xs text-slate-500">Next →</div>
                <div className="text-sm font-medium text-slate-200">{next.title}</div>
              </Link>
            )}
          </div>
          <Link
            href={`/learn/${bundle.track.slug}`}
            className="inline-block text-sm text-sky-400 hover:underline"
          >
            All {bundle.track.title} units →
          </Link>
        </nav>
      </footer>
    </main>
  );
}
