"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "danger" | "neutral";

const TONE: Record<Tone, string> = {
  primary: "", // shadcn's default variant already maps to our brand (--primary = sky)
  success: "bg-emerald-600 text-white hover:bg-emerald-600/85 focus-visible:ring-emerald-500/50",
  danger: "bg-rose-600 text-white hover:bg-rose-600/85 focus-visible:ring-rose-500/50",
  neutral: "", // pair with variant="outline" / "secondary" via props
};

/**
 * Brand wrapper over the shadcn Button. Add brand/semantic variants HERE — never edit
 * components/ui/button.tsx, so it stays safe to regenerate (see the shadcn-wrapper rule).
 */
export function WhetstoneButton({
  tone = "primary",
  className,
  ...props
}: React.ComponentProps<typeof Button> & { tone?: Tone }) {
  return <Button className={cn(TONE[tone], className)} {...props} />;
}
