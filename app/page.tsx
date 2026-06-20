import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 space-y-6">
      <h1 className="text-3xl font-bold text-slate-50">Whetstone</h1>
      <p className="text-slate-400">Sharpen any skill through deliberate practice.</p>
      <div className="pt-2">
        <Link
          href="/learn/react-hooks-and-rendering/use-effect"
          className="inline-block rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-500"
        >
          Start: useEffect — and when not to use it →
        </Link>
      </div>
    </main>
  );
}
