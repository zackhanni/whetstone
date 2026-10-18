"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Markdown } from "./markdown";
import { InlineMarkdown } from "./inline-markdown";
import { FlagLink } from "./flag-link";
import { WhetstoneButton } from "./whetstone-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { shuffle } from "@/lib/shuffle";
import type { Block } from "@/learning/schema";

type QuizBlockData = Extract<Block, { type: "quiz" }>;
type Question = QuizBlockData["questions"][number];
type Option = Question["options"][number];

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

function marker(revealed: boolean, sel: boolean, isAns: boolean) {
  if (revealed && isAns) return <span className="ml-auto text-emerald-400">✓</span>;
  if (revealed && sel && !isAns) return <span className="ml-auto text-rose-400">✗</span>;
  return null;
}

/**
 * One option. Declared at module level, not inside QuestionView: a component defined inside
 * another is a new type on every render, so React remounted every row on each selection (and
 * each drill-timer tick) and keyboard focus fell back to <body>.
 */
function OptionRow({
  id,
  option,
  multi,
  isSelected,
  isAnswer,
  revealed,
  onToggle,
}: {
  id: string;
  option: Option;
  multi: boolean;
  isSelected: boolean;
  isAnswer: boolean;
  revealed: boolean;
  onToggle: (isChecked: boolean) => void;
}) {
  return (
    <Label htmlFor={id} className={rowClass(revealed, isSelected, isAnswer)}>
      {multi ? (
        <Checkbox
          id={id}
          checked={isSelected}
          disabled={revealed}
          onCheckedChange={(c) => onToggle(c === true)}
        />
      ) : (
        <RadioGroupItem id={id} value={option.id} />
      )}
      <span>
        <InlineMarkdown>{option.text}</InlineMarkdown>
      </span>
      {marker(revealed, isSelected, isAnswer)}
    </Label>
  );
}

function QuestionView({
  item,
  blockId,
  mode,
  forceReveal,
  onResult,
}: {
  item: Question;
  blockId: string;
  mode: Mode;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  const [options, setOptions] = useState(item.options);
  useEffect(() => {
    // Client-only shuffle after mount: server + first client render stay in canonical order
    // (no hydration mismatch), then randomize once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptions(item.shuffleOptions === false ? item.options : shuffle(item.options));
  }, [item]);

  const multi = Array.isArray(item.answer);
  const answerSet = new Set(Array.isArray(item.answer) ? item.answer : [item.answer]);
  const [selected, setSelected] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const revealed = mode === "browse" ? hasSubmitted : forceReveal;
  const correct = isCorrect(item, selected);
  const hasAnswer = selected.length > 0;

  useEffect(() => {
    onResult(`${blockId}:${item.id}`, { correct, answered: hasAnswer });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const renderOption = (o: Option) => (
    <OptionRow
      key={o.id}
      id={`${blockId}-${item.id}-${o.id}`}
      option={o}
      multi={multi}
      isSelected={selected.includes(o.id)}
      isAnswer={answerSet.has(o.id)}
      revealed={revealed}
      onToggle={(isChecked) =>
        setSelected((s) => (isChecked ? [...s, o.id] : s.filter((x) => x !== o.id)))
      }
    />
  );

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium text-slate-100">
          <InlineMarkdown>{item.prompt}</InlineMarkdown>
        </p>
        <FlagLink block={blockId} item={item.id} />
      </div>

      {multi ? (
        <div className="grid gap-2">
          {options.map(renderOption)}
        </div>
      ) : (
        <RadioGroup
          value={selected[0] ?? ""}
          disabled={revealed}
          onValueChange={(v) => setSelected([v])}
        >
          {options.map(renderOption)}
        </RadioGroup>
      )}

      {mode === "browse" && !hasSubmitted && (
        <WhetstoneButton size="sm" disabled={!hasAnswer} onClick={() => setHasSubmitted(true)}>
          Check
        </WhetstoneButton>
      )}

      {revealed && (
        <div className={clsx("rounded-lg p-3 text-sm", correct ? "bg-emerald-500/10" : "bg-rose-500/10")}>
          <span className={clsx("font-semibold", correct ? "text-emerald-300" : "text-rose-300")}>
            {correct ? "Correct" : "Not quite"}
          </span>
          <div className="mt-1">
            <Markdown>{item.explanation}</Markdown>
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
  block: QuizBlockData;
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
          item={q}
          blockId={block.id}
          mode={mode}
          forceReveal={forceReveal}
          onResult={onResult}
        />
      ))}
    </div>
  );
}
