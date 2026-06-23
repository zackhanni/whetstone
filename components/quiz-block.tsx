"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Markdown } from "./markdown";
import { WhetstoneButton } from "./whetstone-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

function rowClass(revealed: boolean, sel: boolean, isAns: boolean) {
  return clsx(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm ring-1 transition",
    revealed ? "cursor-default" : "cursor-pointer",
    !revealed && sel && "bg-sky-500/10 ring-sky-500",
    !revealed && !sel && "ring-slate-800 hover:ring-slate-600",
    revealed && isAns && "bg-emerald-500/10 ring-emerald-500",
    revealed && sel && !isAns && "bg-rose-500/10 ring-rose-500",
    revealed && !isAns && !sel && "opacity-60 ring-slate-800",
  );
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
  const [options, setOptions] = useState(q.options);
  useEffect(() => {
    // Client-only shuffle after mount: server + first client render stay in canonical order
    // (no hydration mismatch), then randomize once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const marker = (sel: boolean, isAns: boolean) =>
    revealed && isAns ? (
      <span className="ml-auto text-emerald-400">✓</span>
    ) : revealed && sel && !isAns ? (
      <span className="ml-auto text-rose-400">✗</span>
    ) : null;

  function Row({ o }: { o: Option }) {
    const sel = selected.includes(o.id);
    const isAns = answerSet.has(o.id);
    const id = `${blockId}-${q.id}-${o.id}`;
    return (
      <Label htmlFor={id} className={rowClass(revealed, sel, isAns)}>
        {multi ? (
          <Checkbox
            id={id}
            checked={sel}
            disabled={revealed}
            onCheckedChange={(c) =>
              setSelected((s) => (c === true ? [...s, o.id] : s.filter((x) => x !== o.id)))
            }
          />
        ) : (
          <RadioGroupItem id={id} value={o.id} />
        )}
        <span>{o.text}</span>
        {marker(sel, isAns)}
      </Label>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-medium text-slate-100">{q.prompt}</p>

      {multi ? (
        <div className="grid gap-2">
          {options.map((o) => (
            <Row key={o.id} o={o} />
          ))}
        </div>
      ) : (
        <RadioGroup
          value={selected[0] ?? ""}
          disabled={revealed}
          onValueChange={(v) => setSelected([v])}
        >
          {options.map((o) => (
            <Row key={o.id} o={o} />
          ))}
        </RadioGroup>
      )}

      {mode === "browse" && !checked && (
        <WhetstoneButton size="sm" disabled={selected.length === 0} onClick={() => setChecked(true)}>
          Check
        </WhetstoneButton>
      )}

      {revealed && (
        <div className={clsx("rounded-lg p-3 text-sm", correct ? "bg-emerald-500/10" : "bg-rose-500/10")}>
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
    // Client-only shuffle after mount (see QuestionView) — avoids SSR hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
