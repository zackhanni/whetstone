import { describe, expect, it } from "vitest";
import { FEEDBACK_LABEL, FEEDBACK_REPO, feedbackIssueUrl, feedbackMarker } from "./feedback";

/** /improve-lesson parses the marker back out of the issue body, so it must round-trip. */
describe("feedbackIssueUrl", () => {
  const target = { track: "react-hooks-and-rendering", unit: "use-effect", block: "quiz-effects", item: "q1" };
  const url = new URL(feedbackIssueUrl(target));

  it("opens a new issue in the feedback repo with the feedback label", () => {
    expect(url.origin + url.pathname).toBe(`https://github.com/${FEEDBACK_REPO}/issues/new`);
    expect(url.searchParams.get("labels")).toBe(FEEDBACK_LABEL);
  });

  it("names the exact content in the title", () => {
    expect(url.searchParams.get("title")).toBe("Feedback: use-effect / quiz-effects / q1");
  });

  it("embeds a marker whose JSON round-trips to the target", () => {
    const body = url.searchParams.get("body") ?? "";
    expect(body).toContain(feedbackMarker(target));
    const json = /<!-- whetstone-feedback (.+) -->/.exec(body)?.[1] ?? "";
    expect(JSON.parse(json)).toEqual(target);
  });

  it("omits the item when flagging a whole block", () => {
    const blockOnly = new URL(feedbackIssueUrl({ ...target, item: undefined }));
    expect(blockOnly.searchParams.get("title")).toBe("Feedback: use-effect / quiz-effects");
  });
});
