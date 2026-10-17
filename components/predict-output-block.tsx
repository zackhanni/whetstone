"use client";

import { useEffect, useState } from "react";
import { Markdown } from "./markdown";
import { InlineMarkdown } from "./inline-markdown";
import { FlagLink } from "./flag-link";
import { WhetstoneButton } from "./whetstone-button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
      <div className="flex items-start justify-between gap-3">
        <Label htmlFor={inputId} className="block font-medium text-slate-100">
          <span>
            <InlineMarkdown>{s.question}</InlineMarkdown>
          </span>
        </Label>
        <FlagLink block={blockId} item={s.id} />
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

      {mode === "browse" && !checked && (
        <WhetstoneButton size="sm" disabled={!val.trim()} onClick={() => setChecked(true)}>
          Reveal
        </WhetstoneButton>
      )}

      {revealed && (
        <div className="space-y-2 rounded-lg bg-slate-800/60 p-3 text-sm">
          <div className="text-slate-200">
            <span className="font-semibold text-sky-300">Answer:</span> {s.answer}
          </div>
          {/* Self-graded, so show the other phrasings that count before the learner marks ✓/✗. */}
          {s.acceptable && s.acceptable.length > 0 && (
            <div className="text-slate-300">
              <span className="font-semibold text-sky-300">Also counts:</span>{" "}
              {s.acceptable.join(" · ")}
            </div>
          )}
          <Markdown>{s.explanation}</Markdown>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-slate-400">Did you get it?</span>
            <WhetstoneButton
              size="xs"
              tone={selfCorrect === true ? "success" : "neutral"}
              variant={selfCorrect === true ? "default" : "outline"}
              onClick={() => setSelfCorrect(true)}
            >
              ✓ Yes
            </WhetstoneButton>
            <WhetstoneButton
              size="xs"
              tone={selfCorrect === false ? "danger" : "neutral"}
              variant={selfCorrect === false ? "default" : "outline"}
              onClick={() => setSelfCorrect(false)}
            >
              ✗ No
            </WhetstoneButton>
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
