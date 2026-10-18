"use client";

import { useEffect, useState } from "react";
import { Markdown } from "./markdown";
import { InlineMarkdown } from "./inline-markdown";
import { FlagLink } from "./flag-link";
import { WhetstoneButton } from "./whetstone-button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Block } from "@/learning/schema";

type PredictOutputBlockData = Extract<Block, { type: "predict-output" }>;
type Snippet = PredictOutputBlockData["snippets"][number];

type OnResult = (key: string, r: { correct: boolean; answered: boolean }) => void;

function SnippetView({
  item,
  blockId,
  forceReveal,
  onResult,
}: {
  item: Snippet;
  blockId: string;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  const [val, setVal] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [selfCorrect, setSelfCorrect] = useState<boolean | null>(null);
  // Unlike a quiz, a snippet can be revealed during a drill: it is self-graded, and a grade
  // given after Finish would never reach the saved attempt. So Finish locks the grade instead.
  const revealed = hasSubmitted || forceReveal;
  const isGradeLocked = forceReveal;
  const inputId = `${blockId}-${item.id}`;

  // A free-text prediction can't be fuzzy-matched honestly, so it's self-assessed against
  // the shown answer. The score, in both modes, reflects the learner's own ✓/✗.
  useEffect(() => {
    onResult(`${blockId}:${item.id}`, {
      correct: selfCorrect === true,
      answered: val.trim() !== "" || selfCorrect !== null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val, selfCorrect]);

  return (
    <div className="space-y-3">
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-200 ring-1 ring-slate-800">
        {item.code}
      </pre>
      <div className="flex items-start justify-between gap-3">
        <Label htmlFor={inputId} className="block font-medium text-slate-100">
          <span>
            <InlineMarkdown>{item.question}</InlineMarkdown>
          </span>
        </Label>
        <FlagLink block={blockId} item={item.id} />
      </div>
      <Textarea
        id={inputId}
        value={val}
        disabled={revealed}
        rows={2}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Your prediction…"
        className="bg-slate-800 text-slate-100"
      />

      {!hasSubmitted && !forceReveal && (
        <WhetstoneButton size="sm" disabled={!val.trim()} onClick={() => setHasSubmitted(true)}>
          Reveal
        </WhetstoneButton>
      )}

      {revealed && (
        <div className="space-y-2 rounded-lg bg-slate-800/60 p-3 text-sm">
          <div className="text-slate-200">
            <span className="font-semibold text-sky-300">Answer:</span> {item.answer}
          </div>
          {/* Self-graded, so show the other phrasings that count before the learner marks ✓/✗. */}
          {item.acceptable && item.acceptable.length > 0 && (
            <div className="text-slate-300">
              <span className="font-semibold text-sky-300">Also counts:</span>{" "}
              {item.acceptable.join(" · ")}
            </div>
          )}
          <Markdown>{item.explanation}</Markdown>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-slate-400">Did you get it?</span>
            <WhetstoneButton
              size="xs"
              tone={selfCorrect === true ? "success" : "neutral"}
              variant={selfCorrect === true ? "default" : "outline"}
              disabled={isGradeLocked}
              onClick={() => setSelfCorrect(true)}
            >
              ✓ Yes
            </WhetstoneButton>
            <WhetstoneButton
              size="xs"
              tone={selfCorrect === false ? "danger" : "neutral"}
              variant={selfCorrect === false ? "default" : "outline"}
              disabled={isGradeLocked}
              onClick={() => setSelfCorrect(false)}
            >
              ✗ No
            </WhetstoneButton>
          </div>
          {isGradeLocked && selfCorrect === null && (
            <div className="text-xs text-slate-400">
              Not graded: reveal and mark a snippet before you finish for it to count.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PredictOutputBlock({
  block,
  forceReveal,
  onResult,
}: {
  block: PredictOutputBlockData;
  forceReveal: boolean;
  onResult: OnResult;
}) {
  return (
    <div className="space-y-6">
      {block.snippets.map((s) => (
        <SnippetView
          key={s.id}
          item={s}
          blockId={block.id}
          forceReveal={forceReveal}
          onResult={onResult}
        />
      ))}
    </div>
  );
}
