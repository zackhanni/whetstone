"use client";

import { Markdown } from "./markdown";
import { Accordion } from "./accordion";
import type { ChallengeBundle } from "@/lib/content";

export function ChallengeBlock({ bundle }: { bundle: ChallengeBundle }) {
  const { readme, starter, meta } = bundle;
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-900/40 p-4 ring-1 ring-slate-800">
        {readme ? <Markdown>{readme}</Markdown> : <p className="text-slate-300">{meta.prompt}</p>}
      </div>
      {starter && (
        <Accordion title="Starter code (preview)">
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-200 ring-1 ring-slate-800">
            {starter}
          </pre>
        </Accordion>
      )}
      <p className="text-xs text-slate-500">
        ⚙️ The in-browser editor + Vitest grader lands next — this is a live preview of the
        challenge prompt and starter.
      </p>
    </div>
  );
}
