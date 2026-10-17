import { describe, expect, it } from "vitest";
import { unitDepth } from "./depth";

describe("unitDepth", () => {
  it("is full whenever there is a challenge", () => {
    expect(unitDepth(["reading", "quiz", "challenge"])).toBe("full");
    expect(unitDepth(["cards", "challenge"])).toBe("full");
  });

  it("is a lesson with a reading or any assessment but no challenge", () => {
    expect(unitDepth(["reading", "quiz", "fill-blank"])).toBe("lesson");
    expect(unitDepth(["reading"])).toBe("lesson");
    expect(unitDepth(["cards", "quiz"])).toBe("lesson"); // a card unit that has bloomed
  });

  it("is a card when the unit is only cards", () => {
    expect(unitDepth(["cards"])).toBe("card");
    expect(unitDepth(["cards", "cards"])).toBe("card");
  });
});
