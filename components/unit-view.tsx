"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UnitBundle, Tier, ReadingExample } from "@/lib/content";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WhetstoneButton } from "./whetstone-button";
import { loadAttempts, saveAttempt, bestOf, type DrillAttempt } from "@/lib/drill-history";
import { useProgress } from "@/components/progress-provider";
import { ReadingBlock } from "./reading-block";
import { QuizBlock } from "./quiz-block";
import { FillBlankBlock } from "./fill-blank-block";
import { PredictOutputBlock } from "./predict-output-block";
import { ChallengeBlock } from "./challenge-block";

type Mode = "browse" | "drill";
type Result = { correct: boolean; answered: boolean };

const LABELS: Record<string, string> = {
  reading: "Read",
  quiz: "Quiz",
  "fill-blank": "Fill in the blank",
  "predict-output": "Predict the output",
  challenge: "Challenge",
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function UnitView({ bundle }: { bundle: UnitBundle }) {
  const [mode, setMode] = useState<Mode>("browse");
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<DrillAttempt[]>([]);
  const { record } = useProgress();

  const drillId = `${bundle.track.slug}/${bundle.unit.slug}`;
  useEffect(() => {
    // Load saved attempts on the client only (localStorage): empty on the server + first
    // render, then hydrate — so it's not a render-time setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadAttempts(drillId));
  }, [drillId]);

  useEffect(() => {
    if (mode !== "drill" || finished || startedAt == null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [mode, finished, startedAt]);

  function reset(drill: boolean) {
    setFinished(false);
    setResults({});
    setElapsed(0);
    setStartedAt(drill ? Date.now() : null);
  }

  function switchMode(m: Mode) {
    if (m === mode) return; // re-clicking the active mode shouldn't wipe progress
    setMode(m);
    reset(m === "drill");
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
  const correctCount = Object.values(results).filter((r) => r.correct).length;
  const answeredCount = Object.values(results).filter((r) => r.answered).length;

  const best = bestOf(history);
  const current = history[0] ?? null;
  const priorBest = bestOf(history.slice(1));
  const isNewBest =
    current != null &&
    (priorBest == null ||
      current.score > priorBest.score ||
      (current.score === priorBest.score && current.timeSec < priorBest.timeSec));

  // Persist per-unit progress (visited on mount, answered as they go) for the dashboard.
  // Writes through the shared ProgressProvider so the dashboard reflects it live on navigation.
  useEffect(() => {
    record(drillId, answeredCount, total);
  }, [record, drillId, answeredCount, total]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="max-w-3xl space-y-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">{bundle.track.title}</div>
        <h1 className="text-2xl font-bold text-slate-50">{bundle.unit.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && switchMode(v as Mode)}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem
              value="browse"
              className="capitalize data-[state=on]:bg-sky-600 data-[state=on]:text-white"
            >
              Browse
            </ToggleGroupItem>
            <ToggleGroupItem
              value="drill"
              className="capitalize data-[state=on]:bg-sky-600 data-[state=on]:text-white"
            >
              Drill
            </ToggleGroupItem>
          </ToggleGroup>
          {mode === "drill" && (
            <span className="tabular-nums text-sm text-slate-400">⏱ {fmt(elapsed)}</span>
          )}
          <span className="text-xs text-slate-500">~{bundle.unit.estimatedMinutes} min</span>
        </div>
        {mode === "drill" && (
          <p className="text-xs text-slate-500">
            Drill mode: answers stay hidden until you finish. Then you get your score and time.
          </p>
        )}
      </header>

      {bundle.unit.blocks.map((block) => {
        // Drill mode hides the teaching material — you're testing recall, not reading.
        if (block.type === "reading" && mode === "drill") return null;
        return (
          <section
            key={block.id}
            className={`space-y-3${block.type === "challenge" ? "" : " max-w-3xl"}`}
          >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {LABELS[block.type] ?? block.type}
          </div>
          {block.type === "reading" && (
            <ReadingBlock readings={bundle.readings[block.id] as Record<Tier, ReadingExample[]>} />
          )}
          {block.type === "quiz" && (
            <QuizBlock block={block} mode={mode} forceReveal={forceReveal} onResult={onResult} />
          )}
          {block.type === "fill-blank" && (
            <FillBlankBlock block={block} mode={mode} forceReveal={forceReveal} onResult={onResult} />
          )}
          {block.type === "predict-output" && (
            <PredictOutputBlock
              block={block}
              mode={mode}
              forceReveal={forceReveal}
              onResult={onResult}
            />
          )}
          {block.type === "challenge" && (
            <ChallengeBlock bundle={bundle.challenges[block.challengeSlug]} />
          )}
          </section>
        );
      })}

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
              saveAttempt(drillId, {
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
              answered {answeredCount} · time {fmt(elapsed)}
            </div>
            {best && (
              <div className="mt-1 text-xs text-slate-500">
                {isNewBest ? "🎉 New best!" : `Best: ${best.score}/${best.total} · ${fmt(best.timeSec)}`}
              </div>
            )}
          </div>

          {history.length > 1 && (
            <div className="border-t border-slate-800 pt-3 text-left">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recent attempts
              </div>
              <ul className="space-y-1 text-sm text-slate-400">
                {history.slice(0, 5).map((a, i) => (
                  <li key={a.at} className="flex justify-between">
                    <span>
                      {a.score}/{a.total} · {fmt(a.timeSec)}
                    </span>
                    <span className="text-slate-600">
                      {i === 0 ? "just now" : new Date(a.at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <WhetstoneButton size="sm" onClick={() => reset(true)}>
            Retry
          </WhetstoneButton>
        </div>
      )}
    </div>
  );
}
