import { describe, expect, it } from "vitest";
import { Taxonomy, TAXONOMY } from "./taxonomy";

/**
 * The structural core of the tag feature: `Taxonomy`'s superRefine is what stops a hand-edit to
 * TAXONOMY from shipping a cycle, a dangling parent, or a duplicate slug. `pnpm validate` parses
 * the real registry; these cover the invariants directly with minimal inputs.
 */
describe("Taxonomy validator", () => {
  it("accepts a valid registry", () => {
    expect(
      Taxonomy.safeParse([
        { slug: "a", label: "A", parents: [] },
        { slug: "b", label: "B", parents: ["a"] },
      ]).success,
    ).toBe(true);
  });

  it("accepts multiple parents (a DAG)", () => {
    expect(
      Taxonomy.safeParse([
        { slug: "a", label: "A", parents: [] },
        { slug: "b", label: "B", parents: [] },
        { slug: "c", label: "C", parents: ["a", "b"] },
      ]).success,
    ).toBe(true);
  });

  it("rejects duplicate slugs", () => {
    expect(
      Taxonomy.safeParse([
        { slug: "a", label: "A", parents: [] },
        { slug: "a", label: "A2", parents: [] },
      ]).success,
    ).toBe(false);
  });

  it("rejects an unknown parent", () => {
    expect(Taxonomy.safeParse([{ slug: "a", label: "A", parents: ["missing"] }]).success).toBe(false);
  });

  it("rejects a direct cycle", () => {
    expect(
      Taxonomy.safeParse([
        { slug: "a", label: "A", parents: ["b"] },
        { slug: "b", label: "B", parents: ["a"] },
      ]).success,
    ).toBe(false);
  });

  it("rejects a self-referential cycle", () => {
    expect(Taxonomy.safeParse([{ slug: "a", label: "A", parents: ["a"] }]).success).toBe(false);
  });

  it("the real TAXONOMY is structurally valid", () => {
    expect(Taxonomy.safeParse(TAXONOMY).success).toBe(true);
  });
});
