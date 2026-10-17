import type { Block } from "@/learning/schema";

/**
 * How deep a unit goes, DERIVED from its blocks rather than declared, so it can't drift from the
 * content (docs/cards-and-lesson-depth.md). A precedence ladder, top-down, so every combination
 * of blocks lands in exactly one bucket:
 *
 * - **full** — has a challenge: it proves transfer to real code.
 * - **lesson** — teaches or checks (a reading or any assessment) but has no challenge yet.
 * - **card** — only cards: a reminder. Adding blocks "blooms" it into a lesson.
 */
export type Depth = "card" | "lesson" | "full";

export const DEPTH_LABEL: Record<Depth, string> = { card: "Card", lesson: "Lesson", full: "Full" };

export function unitDepth(blockTypes: readonly Block["type"][]): Depth {
  if (blockTypes.includes("challenge")) return "full";
  if (blockTypes.some((t) => t !== "cards")) return "lesson";
  return "card";
}
