import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, clipDescription, pageMetadata, plainText } from "./seo";

describe("clipDescription", () => {
  it("keeps text that already fits", () => {
    expect(clipDescription("Short.")).toBe("Short.");
  });

  it("cuts at the last sentence end that fits", () => {
    const text = `${"a".repeat(70)}. ${"b".repeat(100)}.`;
    expect(clipDescription(text)).toBe(`${"a".repeat(70)}.`);
  });

  it("doesn't treat a dot inside a word as a sentence end", () => {
    // Used to return a fragment that started mid-text when "Next.js" split the first sentence.
    const out = clipDescription(`Next.js 16 caching ${"word ".repeat(40)}`);
    expect(out.startsWith("Next.js 16 caching")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(155);
  });

  it("cuts at a word when the only sentence end is too early", () => {
    const out = clipDescription(`Short one. ${"word ".repeat(40)}`);
    expect(out.startsWith("Short one. word")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("plainText", () => {
  it("drops inline code ticks and bold markers", () => {
    expect(plainText("Use `useState`, **not** a ref")).toBe("Use useState, not a ref");
  });
});

describe("pageMetadata", () => {
  it("sets the canonical and repeats the Open Graph image on every page", () => {
    const meta = pageMetadata({ title: "Unit", description: "D", path: "/learn/t/u" });
    expect(meta.alternates?.canonical).toBe("/learn/t/u");
    expect(meta.openGraph).toMatchObject({ title: "Unit · Whetstone", url: "/learn/t/u" });
    expect(JSON.stringify(meta.openGraph)).toContain("/opengraph-image");
  });
});

describe("breadcrumbJsonLd", () => {
  it("starts at the home page and uses absolute URLs", () => {
    const items = breadcrumbJsonLd([{ name: "Track", path: "/learn/t" }]).itemListElement;
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[1]?.item).toBe("https://whetstone-tawny.vercel.app/learn/t");
  });
});
