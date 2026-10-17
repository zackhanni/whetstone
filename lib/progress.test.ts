import { describe, expect, it } from "vitest";
import { nextEntry } from "./progress";

describe("nextEntry", () => {
  it("completes a unit once every question is answered", () => {
    expect(nextEntry(undefined, 2, 3, 0).completed).toBe(false);
    expect(nextEntry(undefined, 3, 3, 0).completed).toBe(true);
  });

  it("completes a unit with no questions (only cards) on the first visit", () => {
    const entry = nextEntry(undefined, 0, 0, 0);
    expect(entry).toMatchObject({ visited: true, completed: true, total: 0 });
  });

  it("reverts to in progress when questions are added after completion", () => {
    const done = nextEntry(undefined, 3, 3, 0);
    expect(nextEntry(done, 0, 5, 1)).toMatchObject({ answered: 3, total: 5, completed: false });
  });
});
