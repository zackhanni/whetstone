"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "danger" | "neutral";

const TONE: Record<Tone, string> = {
  primary: "", // shadcn's default variant already maps to our brand (--primary = sky)
  success: "bg-emerald-700 text-white hover:bg-emerald-700/85 focus-visible:ring-emerald-500/50", // 600 is 3.7:1 with white
  danger: "bg-rose-600 text-white hover:bg-rose-600/85 focus-visible:ring-rose-500/50",
  neutral: "", // pair with variant="outline" / "secondary" via props
};

/**
 * Brand wrapper over the shadcn Button. Add brand/semantic variants HERE — never edit
 * components/ui/button.tsx, so it stays safe to regenerate (see AGENTS.md → Code style: don't hand-edit components/ui/*).
 */
export function WhetstoneButton({
  tone = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Button> & { tone?: Tone }) {
  const defaultType = props.asChild ? undefined : "button";
  // Default to type="button" (overridable via props) so a Button in a form never submits by accident.
  return <Button type={defaultType} className={cn(TONE[tone], className)} {...props} />;
}
