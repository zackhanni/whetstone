"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Markdown } from "./markdown";
import { shuffle } from "@/lib/shuffle";

type Option = { id: string; text: string };
type Question = {
  id: string;
  prompt: string;
  options: Option[];
  answer: string | string[];
  explanation: string;
  shuffleOptions?: boolean;
};

type Mode = "browse" | "drill";
type OnResult = (key: string, r: { correct: boolean; answered: boolean }) => void;

function isCorrect(q: Question, selected: string[]) {
  const ans = Array.isArray(q.answer) ? q.answer : [q.answer];
  return ans.length === selected.length && ans.every((a) => selected.includes(a));
}

function QuestionView({
  q,
  blockId,
  mode,
  forceReveal,
  onResult,
}: {
  q: Question;
  blockId: string;
  mode: Mode;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  // Render canonical order on the server + first client render (no hydration mismatch),
  // then shuffle once after mount.
  const [options, setOptions] = useState(q.options);
  useEffect(() => {
    setOptions(q.shuffleOptions === false ? q.options : shuffle(q.options));
  }, [q]);
  const multi = Array.isArray(q.answer);
  const answerSet = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);
  const [selected, setSelected] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const revealed = mode === "browse" ? checked : forceReveal;
  const correct = isCorrect(q, selected);

  useEffect(() => {
    onResult(`${blockId}:${q.id}`, { correct, answered: selected.length > 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function toggle(id: string) {
    if (revealed) return;
    setSelected((s) => (multi ? (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) : [id]));
  }

  return (
    <div className="space-y-3">
      <p className="font-medium text-slate-100">{q.prompt}</p>
      <div className="space-y-2">
        {options.map((o) => {
          const sel = selected.includes(o.id);
          const isAns = answerSet.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              disabled={revealed}
              onClick={() => toggle(o.id)}
              className={clsx(
                "w-full rounded-lg px-3 py-2 text-left text-sm ring-1 transition",
                !revealed && sel && "bg-sky-500/10 ring-sky-500",
                !revealed && !sel && "ring-slate-800 hover:ring-slate-600",
                revealed && isAns && "bg-emerald-500/10 ring-emerald-500",
                revealed && sel && !isAns && "bg-rose-500/10 ring-rose-500",
                revealed && !isAns && !sel && "opacity-60 ring-slate-800",
              )}
            >
              {o.text}
              {revealed && isAns && " ✓"}
              {revealed && sel && !isAns && " ✗"}
            </button>
          );
        })}
      </div>

      {mode === "browse" && !checked && (
        <button
          type="button"
          onClick={() => setChecked(true)}
          disabled={selected.length === 0}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
        >
          Check
        </button>
      )}

      {revealed && (
        <div
          className={clsx(
            "rounded-lg p-3 text-sm",
            correct ? "bg-emerald-500/10" : "bg-rose-500/10",
          )}
        >
          <span className={clsx("font-semibold", correct ? "text-emerald-300" : "text-rose-300")}>
            {correct ? "Correct" : "Not quite"}
          </span>
          <div className="mt-1">
            <Markdown>{q.explanation}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}

export function QuizBlock({
  block,
  mode,
  forceReveal,
  onResult,
}: {
  block: { id: string; questions: Question[] };
  mode: Mode;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  const [questions, setQuestions] = useState(block.questions);
  useEffect(() => {
    setQuestions(shuffle(block.questions));
  }, [block]);
  return (
    <div className="space-y-6">
      {questions.map((q) => (
        <QuestionView
          key={q.id}
          q={q}
          blockId={block.id}
          mode={mode}
          forceReveal={forceReveal}
          onResult={onResult}
        />
      ))}
    </div>
  );
}
