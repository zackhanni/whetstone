"use client";

import { useState } from "react";
import { Markdown } from "./markdown";
import { Accordion } from "./accordion";
import type { ReadingExample, Tier } from "@/lib/content";

const TIER_META: Record<Tier, { label: string; color: string }> = {
  simple: { label: "Simple", color: "text-emerald-400" },
  medium: { label: "Medium", color: "text-amber-400" },
  complex: { label: "Complex", color: "text-rose-400" },
};

function ExampleCard({ ex }: { ex: ReadingExample }) {
  // Content after a <!--more--> marker becomes optional "go deeper" reading.
  const [main, ...rest] = ex.body.split("<!--more-->");
  const more = rest.join("<!--more-->").trim();
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-100">{ex.title}</h4>
      <Markdown>{main.trim()}</Markdown>
      {more && (
        <Accordion title="Go deeper (optional)">
          <Markdown>{more}</Markdown>
        </Accordion>
      )}
    </div>
  );
}

function TierSection({ tier, examples }: { tier: Tier; examples: ReadingExample[] }) {
  const [idx, setIdx] = useState(0);
  if (!examples || examples.length === 0) return null;
  const meta = TIER_META[tier];
  const i = Math.min(idx, examples.length - 1); // clamp so a shrinking list never indexes undefined
  return (
    <div className="rounded-xl bg-slate-900/40 p-4 ring-1 ring-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
          {meta.label}
        </span>
        {examples.length > 1 && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              aria-label="Previous example"
              onClick={() => setIdx(Math.max(0, i - 1))}
              disabled={i === 0}
              className="disabled:opacity-30"
            >
              ←
            </button>
            <span>
              {i + 1} / {examples.length}
            </span>
            <button
              aria-label="Next example"
              onClick={() => setIdx(Math.min(examples.length - 1, i + 1))}
              disabled={i === examples.length - 1}
              className="disabled:opacity-30"
            >
              →
            </button>
          </div>
        )}
      </div>
      <ExampleCard ex={examples[i]} />
    </div>
  );
}

export function ReadingBlock({ readings }: { readings: Record<Tier, ReadingExample[]> }) {
  return (
    <div className="space-y-4">
      {(["simple", "medium", "complex"] as Tier[]).map((t) => (
        <TierSection key={t} tier={t} examples={readings[t]} />
      ))}
    </div>
  );
}
