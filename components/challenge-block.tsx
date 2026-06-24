"use client";

import dynamic from "next/dynamic";
import { Markdown } from "./markdown";
import type { ChallengeBundle } from "@/lib/content";

// Sandpack uses browser APIs and isn't SSR-safe; the unit page is statically generated,
// so load the runner client-only.
const ChallengeRunner = dynamic(
  () => import("./challenge-runner").then((m) => m.ChallengeRunner),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-lg p-4 text-sm text-slate-500 ring-1 ring-slate-800">
        Loading the in-browser editor…
      </div>
    ),
  },
);

export function ChallengeBlock({ bundle }: { bundle: ChallengeBundle }) {
  const { readme, meta } = bundle;
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-900/40 p-4 ring-1 ring-slate-800">
        {readme ? <Markdown>{readme}</Markdown> : <p className="text-slate-300">{meta.prompt}</p>}
      </div>
      {meta.runner === "in-browser" ? (
        <ChallengeRunner bundle={bundle} />
      ) : meta.externalUrl ? (
        <a
          href={meta.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-sky-400 underline"
        >
          Open this challenge in a new tab →
        </a>
      ) : (
        <p className="text-sm text-slate-400">
          This challenge runs locally — clone the repo and run its tests.
        </p>
      )}
    </div>
  );
}
