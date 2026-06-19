"use client";

import {
  Accordion as UIAccordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Thin wrapper that keeps our simple `<Accordion title>children</Accordion>` API while
 * delegating to the accessible Radix-backed shadcn Accordion (aria-expanded, aria-controls,
 * keyboard support). Styled to match our slate surfaces via className only.
 */
export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <UIAccordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? "item" : undefined}
      className="rounded-lg bg-slate-900/40 px-3 ring-1 ring-slate-800"
    >
      <AccordionItem value="item" className="border-b-0">
        <AccordionTrigger className="text-slate-200 hover:no-underline">{title}</AccordionTrigger>
        <AccordionContent className="text-slate-300">{children}</AccordionContent>
      </AccordionItem>
    </UIAccordion>
  );
}
