"use client";

import { Markdown } from "./markdown";
import { FlagLink } from "./flag-link";
import type { MdxFile } from "@/lib/content";

/** A deck of short "one idea, one example" cards, shown all at once as a stack. */
export function CardsBlock({ blockId, cards }: { blockId: string; cards: MdxFile[] }) {
  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <article key={card.id} className="space-y-2 rounded-xl bg-slate-900/40 p-4 ring-1 ring-slate-800">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-slate-100">{card.title}</h3>
            <FlagLink block={blockId} item={card.id} />
          </div>
          <Markdown>{card.body}</Markdown>
        </article>
      ))}
    </div>
  );
}
