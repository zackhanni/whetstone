"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { UnitBundle, Tier, ReadingExample } from "@/lib/content";
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

  useEffect(() => {
    if (mode !== "drill" || finished || startedAt == null) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [mode, finished, startedAt]);

  function switchMode(m: Mode) {
    setMode(m);
    setFinished(false);
    setResults({});
    setElapsed(0);
    setStartedAt(m === "drill" ? Date.now() : null);
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

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">{bundle.track.title}</div>
        <h1 className="text-2xl font-bold text-slate-50">{bundle.unit.title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg p-0.5 text-sm ring-1 ring-slate-700">
            {(["browse", "drill"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={clsx(
                  "rounded-md px-3 py-1 capitalize",
                  mode === m ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200",
                )}
              >
                {m}
              </button>
            ))}
          </div>
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
          <section key={block.id} className="space-y-3">
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
        <button
          type="button"
          onClick={() => setFinished(true)}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
        >
          Finish &amp; score
        </button>
      )}
      {mode === "drill" && finished && (
        <div className="rounded-xl bg-slate-900/60 p-4 text-center ring-1 ring-slate-700">
          <div className="text-3xl font-bold text-slate-50">
            {correctCount} / {total}
          </div>
          <div className="text-sm text-slate-400">
            answered {answeredCount} · time {fmt(elapsed)}
          </div>
          <button
            type="button"
            onClick={() => switchMode("drill")}
            className="mt-3 rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-500"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
