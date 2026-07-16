import { cn } from "@/lib/utils";
import { labelOf, rollupForCard } from "@/lib/tags";

const CHIP = "rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 ring-1 ring-slate-700";

/**
 * Display-only tag chips for a card. Condenses `skills` via `rollupForCard` (broadest-first, root
 * dimensions dropped) into a few visible chips plus a "+N more" pill. Rendered on the server and
 * safe inside a card's <Link> — the overflow uses a native `title` tooltip (no nested interactive
 * element). A tap-friendly Popover comes with the filter UI, where chips live outside links.
 */
export function TagChips({
  skills,
  limit = 4,
  className,
}: {
  skills: string[];
  limit?: number;
  className?: string;
}) {
  const { shown, overflow } = rollupForCard(skills, limit);
  if (shown.length === 0 && overflow.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {shown.map((slug) => (
        <li key={slug} className={CHIP}>
          {labelOf(slug)}
        </li>
      ))}
      {overflow.length > 0 && (
        <li className={cn(CHIP, "text-slate-400")} title={overflow.map(labelOf).join(", ")}>
          +{overflow.length} more
        </li>
      )}
    </ul>
  );
}
