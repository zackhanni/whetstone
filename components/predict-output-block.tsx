"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Markdown } from "./markdown";

type Snippet = {
  id: string;
  code: string;
  question: string;
  answer: string;
  acceptable?: string[];
  explanation: string;
};

type Mode = "browse" | "drill";
type OnResult = (key: string, r: { correct: boolean; answered: boolean }) => void;

function SnippetView({
  s,
  blockId,
  mode,
  forceReveal,
  onResult,
}: {
  s: Snippet;
  blockId: string;
  mode: Mode;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState(false);
  const [selfCorrect, setSelfCorrect] = useState<boolean | null>(null);
  const revealed = mode === "browse" ? checked : forceReveal;
  const inputId = `${blockId}-${s.id}`;

  // A free-text prediction can't be fuzzy-matched honestly, so it's self-assessed against
  // the shown answer. The score reflects the learner's own ✓/✗.
  useEffect(() => {
    onResult(`${blockId}:${s.id}`, {
      correct: selfCorrect === true,
      answered: val.trim() !== "" || selfCorrect !== null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val, selfCorrect]);

  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-200 ring-1 ring-slate-800">
        {s.code}
      </pre>
      <label htmlFor={inputId} className="block font-medium text-slate-100">
        {s.question}
      </label>
      <textarea
        id={inputId}
        value={val}
        disabled={revealed}
        rows={2}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Your prediction…"
        className="w-full rounded-lg bg-slate-800 p-2 text-sm text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
      />

      {mode === "browse" && !checked && (
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={!val.trim()}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          Reveal
        </button>
      )}

      {revealed && (
        <div className="space-y-2 rounded-lg bg-slate-800/60 p-3 text-sm">
          <div className="text-slate-200">
            <span className="font-semibold text-sky-300">Answer:</span> {s.answer}
          </div>
          <Markdown>{s.explanation}</Markdown>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-slate-400">Did you get it?</span>
            <button
              type="button"
              onClick={() => setSelfCorrect(true)}
              className={clsx(
                "rounded px-2 py-1 text-xs",
                selfCorrect === true ? "bg-emerald-600 text-white" : "text-slate-300 ring-1 ring-slate-600",
              )}
            >
              ✓ Yes
            </button>
            <button
              type="button"
              onClick={() => setSelfCorrect(false)}
              className={clsx(
                "rounded px-2 py-1 text-xs",
                selfCorrect === false ? "bg-rose-600 text-white" : "text-slate-300 ring-1 ring-slate-600",
              )}
            >
              ✗ No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PredictOutputBlock({
  block,
  mode,
  forceReveal,
  onResult,
}: {
  block: { id: string; snippets: Snippet[] };
  mode: Mode;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  return (
    <div className="space-y-6">
      {block.snippets.map((s) => (
        <SnippetView
          key={s.id}
          s={s}
          blockId={block.id}
          mode={mode}
          forceReveal={forceReveal}
          onResult={onResult}
        />
      ))}
    </div>
  );
}
