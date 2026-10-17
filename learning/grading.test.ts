import { describe, expect, it } from "vitest";
import { blankMatches, normalizeBlankAnswer } from "./grading";

describe("fill-blank grading", () => {
  it("ignores whitespace, case and quote style", () => {
    expect(blankMatches("()=>", ["() =>"])).toBe(true);
    expect(blankMatches("  REMOVEEventListener ", ["removeEventListener"])).toBe(true);
    expect(blankMatches("'resize'", ['"resize"'])).toBe(true);
    expect(blankMatches("`resize`", ['"resize"'])).toBe(true);
  });

  it("still tells different answers apart", () => {
    expect(blankMatches("addEventListener", ["removeEventListener"])).toBe(false);
    expect(blankMatches("[]", ["[width]"])).toBe(false);
  });

  it("never accepts an empty or blank answer", () => {
    expect(blankMatches("", ["x"])).toBe(false);
    expect(blankMatches("   ", ["x"])).toBe(false);
  });

  it("normalizes the way the schema's duplicate check expects", () => {
    expect(normalizeBlankAnswer("() => ")).toBe(normalizeBlankAnswer("()=>"));
  });
});
