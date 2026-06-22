import { notFound } from "next/navigation";
import Link from "next/link";
import { loadUnit, listUnits } from "@/lib/content";
import { UnitView } from "@/components/unit-view";

// Only units returned by generateStaticParams exist; any other path 404s instead of 500ing.
export const dynamicParams = false;

export async function generateStaticParams() {
  return listUnits();
}

export default async function UnitPage({
  params,
}: {
  params: { track: string; unit: string };
}) {
  const bundle = await loadUnit(params.track, params.unit).catch(() => notFound());
  return (
    <main>
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Whetstone
        </Link>
      </div>
      <UnitView bundle={bundle} />
    </main>
  );
}
