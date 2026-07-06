import Link from "next/link";
import { listTracks } from "@/lib/content";

export default async function Home() {
  const tracks = await listTracks();
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-50">Whetstone</h1>
        <p className="text-slate-400">Sharpen any skill through deliberate practice.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracks</h2>
        {tracks.length === 0 ? (
          <p className="text-sm text-slate-500">No tracks yet.</p>
        ) : (
          tracks.map((t) => (
            <Link
              key={t.slug}
              href={`/learn/${t.slug}`}
              className="block rounded-xl bg-slate-900/40 p-4 ring-1 ring-slate-800 transition hover:ring-slate-600"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-100">{t.title}</h3>
                <span className="shrink-0 text-xs text-slate-500">
                  {t.unitCount} unit{t.unitCount === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">{t.description}</p>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
