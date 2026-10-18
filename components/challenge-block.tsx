"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink } from "lucide-react";
import { Markdown } from "./markdown";
import { InlineMarkdown } from "./inline-markdown";
import { FlagLink } from "./flag-link";
import { Accordion } from "./accordion";
import type { ChallengeBundle } from "@/lib/content";

// The runner's measured height, so the page doesn't jump when it mounts: Sandpack stacks the
// editor and preview (2 × 460 px + toolbar) up to a 768 px viewport and puts them side by side
// from 769 px.
const RUNNER_PLACEHOLDER_CLASS =
  "min-h-[968px] min-[769px]:min-h-[506px] rounded-lg p-4 text-sm text-slate-400 ring-1 ring-slate-800";

// Sandpack uses browser APIs and isn't SSR-safe; the unit page is statically generated,
// so load the runner client-only.
const ChallengeRunner = dynamic(
  () => import("./challenge-runner").then((m) => m.ChallengeRunner),
  {
    ssr: false,
    loading: () => <div className={RUNNER_PLACEHOLDER_CLASS}>Loading the in-browser editor…</div>,
  },
);

/**
 * True once the element is within `rootMargin` of the viewport, and from then on. The runner's
 * chunk is about 210 KB of script, most of it unused until someone reaches the challenge, so it
 * is imported only when the challenge comes close (it used to load with every unit page).
 */
function useNearViewport<T extends Element>(rootMargin = "800px") {
  const ref = useRef<T>(null);
  const [isNear, setIsNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || isNear) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsNear(true);
        observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isNear, rootMargin]);
  return [ref, isNear] as const;
}

/**
 * The challenge's title and acceptance criteria come from meta.json, the problem and hints from
 * README.md — each written once (the validator rejects a README that repeats them). Hints sit
 * under a `## Hints` heading and show collapsed after the task, so they aren't spoilers.
 */
export function ChallengeBlock({ blockId, bundle }: { blockId: string; bundle: ChallengeBundle }) {
  const { readme, meta } = bundle;
  const [problem, hints = ""] = readme.split(/^## Hints[ \t]*$/m).map((part) => part.trim());
  const [runnerRef, isRunnerNear] = useNearViewport<HTMLDivElement>();
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
                <span aria-hidden className="text-slate-400">
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
        // scripts/check-challenges-browser.ts scrolls to this attribute to mount the runner.
        <div ref={runnerRef} data-challenge-runner>
          {isRunnerNear ? (
            <ChallengeRunner bundle={bundle} />
          ) : (
            <div className={RUNNER_PLACEHOLDER_CLASS}>Loading the in-browser editor…</div>
          )}
        </div>
      ) : (
        <a
          href={meta.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-sky-400 underline"
        >
          Open this challenge in a new tab
          <ExternalLink className="size-4 shrink-0" aria-hidden />
        </a>
      )}
    </div>
  );
}
