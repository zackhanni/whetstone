import Link from "next/link";
import { loadUnit } from "@/lib/content";
import { UnitView } from "@/components/unit-view";

export const dynamic = "force-dynamic";

export default async function UnitPage({
  params,
}: {
  params: { track: string; unit: string };
}) {
  const bundle = await loadUnit(params.track, params.unit);
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
