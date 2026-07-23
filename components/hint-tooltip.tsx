import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A small wrapper over the shadcn Tooltip trio for consistent styling and one important safety
 * property: the trigger renders as a `<span>` (via `asChild`), not the Radix default `<button>`,
 * so it's valid HTML **inside an `<a>`** (a nested `<button>` is invalid and breaks tap/hydration).
 * Content is width-capped and wraps, for long lists.
 *
 * `focusable` (default `true`) makes the trigger keyboard-reachable. Set it `false` when the tooltip
 * lives **inside a link** (like our card chips): a focusable descendant is still interactive content
 * nested in an `<a>` (invalid + a stray tab stop), and the surrounding link is already focusable —
 * the hover tooltip remains a supplement, not the only way to the info.
 */
export function HintTooltip({
  content,
  children,
  contentClassName,
  focusable = true,
}: {
  content: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  focusable?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={focusable ? 0 : undefined}
          className={cn(
            "cursor-default rounded-full",
            focusable && "outline-none focus-visible:ring-1 focus-visible:ring-slate-500",
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className={cn("max-w-64 text-pretty", contentClassName)}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
