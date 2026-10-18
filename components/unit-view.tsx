"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UnitBundle, Tier, MdxFile } from "@/lib/content";
import type { Block } from "@/learning/schema";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WhetstoneButton } from "./whetstone-button";
import {
  loadAttempts,
  saveAttempt,
  bestOf,
  isBetterAttempt,
  type DrillAttempt,
} from "@/lib/drill-history";
import { unitProgressId } from "@/lib/progress";
import { useProgress } from "@/components/progress-provider";
import { ReadingBlock } from "./reading-block";
import { InlineMarkdown } from "./inline-markdown";
import { QuizBlock } from "./quiz-block";
import { FillBlankBlock } from "./fill-blank-block";
import { PredictOutputBlock } from "./predict-output-block";
import { ChallengeBlock } from "./challenge-block";
import { CardsBlock } from "./cards-block";
import { DEPTH_LABEL, unitDepth } from "@/lib/depth";
import { UnitRefProvider } from "./flag-link";

type Mode = "browse" | "drill";
type Result = { correct: boolean; answered: boolean };

const BLOCK_LABEL: Record<string, string> = {
  reading: "Read",
  cards: "Cards",
  quiz: "Quiz",
  "fill-blank": "Fill in the blank",
  "predict-output": "Predict the output",
  challenge: "Challenge",
} satisfies Record<Block["type"], string>;

const formatClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function UnitView({ bundle }: { bundle: UnitBundle }) {
  const [mode, setMode] = useState<Mode>("browse");
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});
  // Bumped by every reset. It keys the assessment blocks, so a new attempt remounts them with
  // empty answers instead of showing the previous attempt's answers over an empty tally.
  const [attempt, setAttempt] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<DrillAttempt[]>([]);
  const { record } = useProgress();

  const unitId = unitProgressId(bundle.track.slug, bundle.unit.slug);
  const unitRef = useMemo(
    () => ({ track: bundle.track.slug, unit: bundle.unit.slug }),
    [bundle.track.slug, bundle.unit.slug],
  );
  useEffect(() => {
    // Load saved attempts on the client only (localStorage): empty on the server + first
    // render, then hydrate — so it's not a render-time setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadAttempts(unitId));
  }, [unitId]);

  useEffect(() => {
    if (mode !== "drill" || finished || startedAt == null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [mode, finished, startedAt]);

  function resetAttempt(nextMode: Mode) {
    setFinished(false);
    setResults({});
    setAttempt((n) => n + 1);
    setElapsed(0);
    setStartedAt(nextMode === "drill" ? Date.now() : null);
  }

  function switchMode(m: Mode) {
    if (m === mode) return; // defensive: the ToggleGroup never re-sends the current mode
    setMode(m);
    resetAttempt(m);
  }

  const onResult = useCallback((key: string, r: Result) => {
    setResults((prev) => ({ ...prev, [key]: r }));
  }, []);

  const forceReveal = mode === "drill" && finished;

  const total = useMemo(
    () =>
      bundle.unit.blocks.reduce((n, b) => {
        if (b.type === "quiz") return n + b.questions.length;
        if (b.type === "fill-blank") return n + b.prompts.length;
        if (b.type === "predict-output") return n + b.snippets.length;
        return n;
      }, 0),
    [bundle],
  );
  const depth = unitDepth(bundle.unit.blocks.map((b) => b.type));
  const correctCount = Object.values(results).filter((r) => r.correct).length;
  const answeredCount = Object.values(results).filter((r) => r.answered).length;

  const best = bestOf(history);
  const current = history[0] ?? null;
  const priorBest = bestOf(history.slice(1));
  const isNewBest = current != null && (priorBest == null || isBetterAttempt(current, priorBest));

  // Persist per-unit progress (visited on mount, answered as they go) for the dashboard.
  // Writes through the shared ProgressProvider so the dashboard reflects it live on navigation.
  useEffect(() => {
    record(unitId, answeredCount, total);
  }, [record, unitId, answeredCount, total]);

  return (
    <UnitRefProvider value={unitRef}>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <header className="max-w-3xl space-y-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">{bundle.track.title}</div>
          <h1 className="text-2xl font-bold text-slate-50">{bundle.unit.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            {/* Nothing to drill in a unit with no questions (e.g. only cards). */}
            {total > 0 && (
              <ToggleGroup
                type="single"
                value={mode}
                // Radix sends "" when the pressed item is clicked again; ignore it so a re-click
                // doesn't wipe the attempt.
                onValueChange={(v) => v && switchMode(v as Mode)}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem
                  value="browse"
                  className="capitalize data-[state=on]:bg-sky-700 data-[state=on]:text-white"
                >
                  Browse
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="drill"
                  className="capitalize data-[state=on]:bg-sky-700 data-[state=on]:text-white"
                >
                  Drill
                </ToggleGroupItem>
              </ToggleGroup>
            )}
            {mode === "drill" && (
              <span className="tabular-nums text-sm text-slate-400">⏱ {formatClock(elapsed)}</span>
            )}
            <span className="text-xs text-slate-400">
              {DEPTH_LABEL[depth]} · ~{bundle.unit.estimatedMinutes} min
            </span>
          </div>
          {mode === "drill" && (
            <p className="text-xs text-slate-400">
              Drill mode: answers stay hidden until you finish. Then you get your score and time.
              Predict-output snippets are the exception: reveal each one and mark it yourself.
            </p>
          )}
          <div className="rounded-lg bg-slate-900/40 p-3 ring-1 ring-slate-800">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              After this unit you can
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-300">
              {bundle.unit.objectives.map((o) => (
                <li key={o}>
                  <InlineMarkdown>{o}</InlineMarkdown>
                </li>
              ))}
            </ul>
          </div>
        </header>

        {bundle.unit.blocks.map((block) => {
          // Drill mode hides the teaching material — you're testing recall, not reading.
          if ((block.type === "reading" || block.type === "cards") && mode === "drill") return null;
          // Only the graded blocks start over with each attempt; a challenge keeps the learner's
          // code across a mode switch.
          const isGraded = block.type === "quiz" || block.type === "fill-blank" || block.type === "predict-output";
          return (
            <section
              key={isGraded ? `${block.id}:${attempt}` : block.id}
              className={`space-y-3${block.type === "challenge" ? "" : " max-w-3xl"}`}
            >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {BLOCK_LABEL[block.type] ?? block.type}
            </h2>
            {block.type === "reading" && (
              <ReadingBlock
                blockId={block.id}
                readings={bundle.readings[block.id] as Record<Tier, MdxFile[]>}
              />
            )}
            {block.type === "cards" && <CardsBlock blockId={block.id} cards={bundle.cards[block.id]} />}
            {block.type === "quiz" && (
              <QuizBlock block={block} mode={mode} forceReveal={forceReveal} onResult={onResult} />
            )}
            {block.type === "fill-blank" && (
              <FillBlankBlock block={block} mode={mode} forceReveal={forceReveal} onResult={onResult} />
            )}
            {block.type === "predict-output" && (
              <PredictOutputBlock
                block={block}
                forceReveal={forceReveal}
                onResult={onResult}
              />
            )}
            {block.type === "challenge" && (
              <ChallengeBlock blockId={block.id} bundle={bundle.challenges[block.challengeSlug]} />
            )}
            </section>
          );
        })}

        {/* The official docs the unit was checked against. Teaching material, so not in drill. */}
        {mode === "browse" && (
          <section className="max-w-3xl space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Further reading
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {bundle.unit.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noreferrer" className="text-sky-400 underline">
                    {src.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {mode === "drill" && !finished && (
          <WhetstoneButton
            tone="success"
            size="lg"
            className="w-full max-w-3xl"
            onClick={() => {
              // Derive the final time from startedAt — the interval-driven `elapsed` can be up
              // to a second stale (or 0 if finished within the first tick).
              const finalSec = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : elapsed;
              setFinished(true);
              setElapsed(finalSec);
              setHistory(
                saveAttempt(unitId, {
                  score: correctCount,
                  total,
                  timeSec: finalSec,
                  at: Date.now(),
                }),
              );
            }}
          >
            Finish &amp; score
          </WhetstoneButton>
        )}
        {mode === "drill" && finished && (
          <div className="max-w-3xl space-y-4 rounded-xl bg-slate-900/60 p-5 ring-1 ring-slate-700">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-50">
                {correctCount} / {total}
              </div>
              <div className="text-sm text-slate-400">
                answered {answeredCount} · time {formatClock(elapsed)}
              </div>
              {best && (
                <div className="mt-1 text-xs text-slate-400">
                  {isNewBest ? "🎉 New best!" : `Best: ${best.score}/${best.total} · ${formatClock(best.timeSec)}`}
                </div>
              )}
            </div>

            {history.length > 1 && (
              <div className="border-t border-slate-800 pt-3 text-left">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Recent attempts
                </div>
                <ul className="space-y-1 text-sm text-slate-400">
                  {history.slice(0, 5).map((a, i) => (
                    <li key={a.at} className="flex justify-between">
                      <span>
                        {a.score}/{a.total} · {formatClock(a.timeSec)}
                      </span>
                      <span className="text-slate-400">
                        {i === 0 ? "just now" : new Date(a.at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <WhetstoneButton size="sm" onClick={() => resetAttempt("drill")}>
              Retry
            </WhetstoneButton>
          </div>
        )}
      </div>
    </UnitRefProvider>
  );
}
