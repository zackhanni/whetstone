import Link from "next/link";
import { notFound } from "next/navigation";
import { loadTrack, listTrackSlugs } from "@/lib/content";
import { UnitProgress } from "@/components/unit-progress";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listTrackSlugs()).map((track) => ({ track }));
}

const DIFFICULTY: Record<string, string> = {
  intro: "Intro",
  core: "Core",
  advanced: "Advanced",
};

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  const detail = await loadTrack(track).catch(() => notFound());
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
        ← Whetstone
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-50">{detail.title}</h1>
        <p className="text-slate-400">{detail.description}</p>
      </header>

      <ol className="space-y-3">
        {detail.units.map((u, i) => (
          <li key={u.slug}>
            <Link
              href={`/learn/${detail.slug}/${u.slug}`}
              className="block rounded-xl bg-slate-900/40 p-4 ring-1 ring-slate-800 transition hover:ring-slate-600"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-100">
                  <span className="text-slate-500">{i + 1}.</span> {u.title}
                </h2>
                <span className="shrink-0 text-xs text-slate-500">
                  {DIFFICULTY[u.difficulty] ?? u.difficulty} · ~{u.estimatedMinutes} min
                </span>
              </div>
              <div className="mt-2">
                <UnitProgress unitId={`${detail.slug}/${u.slug}`} />
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
