"use client";

import dynamic from "next/dynamic";
import { Markdown } from "./markdown";
import { InlineMarkdown } from "./inline-markdown";
import { FlagLink } from "./flag-link";
import { Accordion } from "./accordion";
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

/**
 * The challenge's title and acceptance criteria come from meta.json, the problem and hints from
 * README.md — each written once (the validator rejects a README that repeats them). Hints sit
 * under a `## Hints` heading and show collapsed after the task, so they aren't spoilers.
 */
export function ChallengeBlock({ blockId, bundle }: { blockId: string; bundle: ChallengeBundle }) {
  const { readme, meta } = bundle;
  const [problem, hints = ""] = readme.split(/^## Hints[ \t]*$/m).map((part) => part.trim());
  return (
    <div className="space-y-3">
      <div className="space-y-4 rounded-lg bg-slate-900/40 p-4 ring-1 ring-slate-800">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-100">
            <InlineMarkdown>{meta.title}</InlineMarkdown>
          </h3>
          <FlagLink block={blockId} />
        </div>
        <Markdown>{problem}</Markdown>
        <div className="space-y-2">
          <h4 className="font-semibold text-slate-100">Your task</h4>
          <p className="text-slate-300">
            Edit <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.85em] text-sky-300">{meta.entry}</code>{" "}
            so the tests pass:
          </p>
          <ul className="space-y-1 text-slate-300">
            {meta.acceptanceCriteria.map((c) => (
              <li key={c} className="flex gap-2">
                <span aria-hidden className="text-slate-500">
                  ☐
                </span>
                <InlineMarkdown>{c}</InlineMarkdown>
              </li>
            ))}
          </ul>
        </div>
        {hints && (
          <Accordion title="Hints">
            <Markdown>{hints}</Markdown>
          </Accordion>
        )}
      </div>
      {meta.runner === "in-browser" ? (
        <ChallengeRunner bundle={bundle} />
      ) : (
        <a
          href={meta.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-sm text-sky-400 underline"
        >
          Open this challenge in a new tab →
        </a>
      )}
    </div>
  );
}
