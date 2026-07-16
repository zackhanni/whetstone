import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A small wrapper over the shadcn Tooltip trio for consistent styling and one important safety
 * property: the trigger renders as a `<span>` (via `asChild`), not the Radix default `<button>`,
 * so it's valid HTML **inside an `<a>`** (our card chips live inside a `<Link>`; a nested
 * `<button>` is invalid and breaks tap/hydration). The span is focusable so keyboard and screen
 * readers can still reach the hint. Content is width-capped and wraps, for long lists.
 */
export function HintTooltip({
  content,
  children,
  contentClassName,
}: {
  content: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-default rounded-full outline-none focus-visible:ring-1 focus-visible:ring-slate-500"
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
