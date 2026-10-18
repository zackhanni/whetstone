/**
 * Learner feedback is a GitHub issue, not a backend: "Flag" links open a prefilled new-issue
 * form, and `/improve-lesson` reads the open issues labelled FEEDBACK_LABEL. The body carries a
 * machine-readable marker with the exact content ids, so the skill can go straight to the
 * unit.json item or reading file without asking.
 */

export const FEEDBACK_REPO = "zackhanni/whetstone";
export const FEEDBACK_LABEL = "lesson-feedback";

/** Where the problem is. `item` is a question/prompt/snippet id, or a reading example or card id. */
export type FeedbackTarget = { track: string; unit: string; block: string; item?: string };

/** The `<!-- whetstone-feedback {...} -->` marker `/improve-lesson` parses out of an issue body. */
export function feedbackMarker(target: FeedbackTarget): string {
  return `<!-- whetstone-feedback ${JSON.stringify(target)} -->`;
}

/** A github.com "new issue" URL, prefilled for one piece of content. */
export function feedbackIssueUrl(target: FeedbackTarget): string {
  const path = [target.unit, target.block, target.item].filter(Boolean).join(" / ");
  const body = [
    `**Where:** \`${path}\` in /learn/${target.track}/${target.unit}`,
    "**Kind** (keep one): content / difficulty / interface",
    "",
    "**What felt off:**",
    "",
    "",
    feedbackMarker(target),
  ].join("\n");
  const params = new URLSearchParams({
    title: `Feedback: ${path}`,
    body,
    labels: FEEDBACK_LABEL,
  });
  return `https://github.com/${FEEDBACK_REPO}/issues/new?${params}`;
}
