"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { blankMatches } from "@/learning/grading";
import { Markdown } from "./markdown";
import { InlineMarkdown } from "./inline-markdown";
import { FlagLink } from "./flag-link";
import { WhetstoneButton } from "./whetstone-button";

type Blank = { id: string; accept: string[] };
type Prompt = { id: string; prompt: string; code: string; blanks: Blank[]; explanation: string };

type Mode = "browse" | "drill";
type OnResult = (key: string, r: { correct: boolean; answered: boolean }) => void;


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
  const results = p.blanks.map((b, i) => blankMatches(vals[i] ?? "", b.accept));
  const correct = results.every(Boolean);

  useEffect(() => {
    onResult(`${blockId}:${p.id}`, { correct, answered: vals.some((v) => v.trim() !== "") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-100">
          <InlineMarkdown>{p.prompt}</InlineMarkdown>
        </p>
        <FlagLink block={blockId} item={p.id} />
      </div>
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
                  {
                    "border-emerald-500": revealed && results[i],
                    "border-rose-500": revealed && !results[i],
                    "border-slate-600 focus:border-sky-500": !revealed,
                  },
                )}
              />
            )}
          </span>
        ))}
      </pre>

      {mode === "browse" && !checked && (
        <WhetstoneButton size="sm" disabled={vals.every((v) => !v.trim())} onClick={() => setChecked(true)}>
          Check
        </WhetstoneButton>
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
