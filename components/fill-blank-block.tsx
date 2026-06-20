"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Markdown } from "./markdown";

type Blank = { id: string; accept: string[] };
type Prompt = { id: string; prompt: string; code: string; blanks: Blank[]; explanation: string };

type Mode = "browse" | "drill";
type OnResult = (key: string, r: { correct: boolean; answered: boolean }) => void;

const norm = (s: string) => s.trim().toLowerCase();

function PromptView({
  p,
  blockId,
  mode,
  forceReveal,
  onResult,
}: {
  p: Prompt;
  blockId: string;
  mode: Mode;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  const parts = p.code.split("___");
  const [vals, setVals] = useState<string[]>(() => p.blanks.map(() => ""));
  const [checked, setChecked] = useState(false);
  const revealed = mode === "browse" ? checked : forceReveal;
  const results = p.blanks.map((b, i) => b.accept.some((a) => norm(a) === norm(vals[i] ?? "")));
  const correct = results.every(Boolean);

  useEffect(() => {
    onResult(`${blockId}:${p.id}`, { correct, answered: vals.some((v) => v.trim() !== "") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals]);

  return (
    <div className="space-y-3">
      <p className="font-medium text-slate-100">{p.prompt}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-sm text-slate-200 ring-1 ring-slate-800">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < p.blanks.length && (
              <input
                aria-label={`Blank ${i + 1}`}
                value={vals[i]}
                disabled={revealed}
                onChange={(e) =>
                  setVals((v) => {
                    const n = [...v];
                    n[i] = e.target.value;
                    return n;
                  })
                }
                placeholder="___"
                className={clsx(
                  "mx-1 w-28 rounded border-b bg-slate-800 px-1 font-mono text-sky-300 outline-none",
                  revealed && results[i]
                    ? "border-emerald-500"
                    : revealed
                      ? "border-rose-500"
                      : "border-slate-600 focus:border-sky-500",
                )}
              />
            )}
          </span>
        ))}
      </pre>

      {mode === "browse" && !checked && (
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={vals.every((v) => !v.trim())}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          Check
        </button>
      )}

      {revealed && (
        <div className={clsx("rounded-lg p-3 text-sm", correct ? "bg-emerald-500/10" : "bg-rose-500/10")}>
          <span className={clsx("font-semibold", correct ? "text-emerald-300" : "text-rose-300")}>
            {correct ? "Correct" : "Not quite"}
          </span>
          {!correct && (
            <div className="mt-1 text-slate-400">
              Accepted: {p.blanks.map((b) => b.accept[0]).join(", ")}
            </div>
          )}
          <div className="mt-1">
            <Markdown>{p.explanation}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}

export function FillBlankBlock({
  block,
  mode,
  forceReveal,
  onResult,
}: {
  block: { id: string; prompts: Prompt[] };
  mode: Mode;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  return (
    <div className="space-y-6">
      {block.prompts.map((p) => (
        <PromptView
          key={p.id}
          p={p}
          blockId={block.id}
          mode={mode}
          forceReveal={forceReveal}
          onResult={onResult}
        />
      ))}
    </div>
  );
}
