"use client";

import { useEffect, useState } from "react";
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

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

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
  const revealed = mode === "browse" ? checked : forceReveal;

  const accepted = [s.answer, ...(s.acceptable ?? [])].map(norm);
  const v = norm(val);
  const correct = v.length > 0 && accepted.some((a) => a.includes(v) || v.includes(a));

  useEffect(() => {
    onResult(`${blockId}:${s.id}`, { correct, answered: val.trim() !== "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val]);

  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-200 ring-1 ring-slate-800">
        {s.code}
      </pre>
      <p className="font-medium text-slate-100">{s.question}</p>
      <textarea
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
        <div className="rounded-lg bg-slate-800/60 p-3 text-sm">
          <div className="text-slate-200">
            <span className="font-semibold text-sky-300">Answer:</span> {s.answer}
          </div>
          <div className="mt-1">
            <Markdown>{s.explanation}</Markdown>
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
