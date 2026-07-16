import { describe, expect, it } from "vitest";
import {
  childrenOf,
  depthOf,
  descendantsOf,
  dimensions,
  expandSelection,
  matches,
  rollupForCard,
  subtreeOf,
} from "./tags";

describe("taxonomy structure", () => {
  it("exposes the roots as dimensions", () => {
    expect(dimensions()).toEqual(["frontend"]);
  });

  it("computes depth as the shortest path to a root", () => {
    expect(depthOf("frontend")).toBe(0);
    expect(depthOf("react")).toBe(1);
    expect(depthOf("hooks")).toBe(2);
    // useState's parents are `hooks` (depth 2) and `state` (depth 2) → 1 + 2 = 3.
    expect(depthOf("useState")).toBe(3);
  });

  it("resolves children from the reverse of the parent edges", () => {
    expect([...childrenOf("refs")].sort()).toEqual(["dom", "useRef"]);
  });

  it("treats unknown tags as depth-0 leaves", () => {
    expect(depthOf("not-a-tag")).toBe(0);
    expect([...descendantsOf("not-a-tag")]).toEqual([]);
  });
});

describe("downward closure", () => {
  it("includes transitive descendants", () => {
    expect(descendantsOf("react").has("useEffect")).toBe(true);
  });

  it("leaves have no descendants; subtree is self", () => {
    expect([...descendantsOf("useEffect")]).toEqual([]);
    expect([...subtreeOf("useEffect")]).toEqual(["useEffect"]);
  });

  it("dedupes diamonds from multiple parents", () => {
    // useState is reachable via both `hooks` and `state`; it must appear once.
    const underState = [...descendantsOf("state")];
    expect(underState.filter((s) => s === "useState")).toHaveLength(1);
  });

  it("expands a selection to the union of subtrees", () => {
    const covered = expandSelection(["refs", "useEffect"]);
    expect(covered.has("useRef")).toBe(true); // via refs
    expect(covered.has("dom")).toBe(true); // via refs
    expect(covered.has("useEffect")).toBe(true); // itself
    expect(covered.has("useState")).toBe(false); // unrelated
  });
});

describe("matches — the filtering rule", () => {
  const useRefLesson = ["react", "hooks", "useRef", "refs", "dom"];
  const useEffectLesson = ["react", "hooks", "useEffect", "data-fetching"];

  it("a broad selection matches every descendant lesson", () => {
    expect(matches(useRefLesson, ["react"])).toBe(true);
    expect(matches(useEffectLesson, ["react"])).toBe(true);
  });

  it("a leaf selection matches only that leaf — not its siblings", () => {
    expect(matches(useEffectLesson, ["useEffect"])).toBe(true);
    expect(matches(useRefLesson, ["useEffect"])).toBe(false);
  });

  it("an empty selection matches everything (no filter)", () => {
    expect(matches(useRefLesson, [])).toBe(true);
  });

  it("is a union (OR) across the selected tags", () => {
    // useRef lesson matches because `dom` is selected, even though `useEffect` is not on it.
    expect(matches(useRefLesson, ["useEffect", "dom"])).toBe(true);
  });

  it("honours multi-parent tags from either parent", () => {
    // `context` sits under both `react` and `state-management`.
    expect(matches(["context"], ["state-management"])).toBe(true);
    expect(matches(["context"], ["react"])).toBe(true);
  });
});

describe("rollupForCard", () => {
  const trackUnion = ["frontend", "react", "hooks", "useState", "useEffect", "useRef", "rendering", "refs"];

  it("drops root dimensions and orders broadest-first", () => {
    const { shown } = rollupForCard(trackUnion, 4);
    expect(shown).not.toContain("frontend");
    expect(shown[0]).toBe("react");
    expect(shown).toHaveLength(4);
  });

  it("puts the remainder in overflow", () => {
    const { shown, overflow } = rollupForCard(trackUnion, 4);
    // 8 tags − 1 dropped root − 4 shown = 3 overflow.
    expect(overflow).toHaveLength(3);
    expect([...shown, ...overflow]).not.toContain("frontend");
  });

  it("can keep roots when asked", () => {
    const { shown } = rollupForCard(["frontend", "react"], 4, true);
    expect(shown).toContain("frontend");
  });
});
