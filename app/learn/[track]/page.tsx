import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { loadTrack, listTrackSlugs } from "@/lib/content";
import { UnitProgressStatus } from "@/components/unit-progress";
import { TagChips } from "@/components/tag-chips";
import { DEPTH_LABEL } from "@/lib/depth";
import { unitProgressId } from "@/lib/progress";
import type { Unit } from "@/learning/schema";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbJsonLd, clipDescription, pageMetadata, plainText } from "@/lib/seo";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listTrackSlugs()).map((track) => ({ track }));
}

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  const detail = await loadTrack(track);
  return pageMetadata({
    title: detail.title,
    description: clipDescription(plainText(detail.description)),
    path: `/learn/${track}`,
  });
}

const DIFFICULTY_LABEL: Record<string, string> = {
  intro: "Intro",
  core: "Core",
  advanced: "Advanced",
} satisfies Record<Unit["difficulty"], string>;

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  // No catch: with dynamicParams = false an unknown slug 404s before this runs, so a failure
  // here is broken content and should fail the build, not render as a 404.
  const detail = await loadTrack(track);
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <JsonLd data={breadcrumbJsonLd([{ name: detail.title, path: `/learn/${track}` }])} />
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300">
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        Whetstone
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
                  <span className="text-slate-400">{i + 1}.</span> {u.title}
                </h2>
                <span className="shrink-0 text-xs text-slate-400">
                  {DEPTH_LABEL[u.depth]} · {DIFFICULTY_LABEL[u.difficulty] ?? u.difficulty} · ~{u.estimatedMinutes} min
                </span>
              </div>
              <TagChips skills={u.skills} className="mt-2" />
              <div className="mt-2">
                <UnitProgressStatus unitId={unitProgressId(detail.slug, u.slug)} />
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
