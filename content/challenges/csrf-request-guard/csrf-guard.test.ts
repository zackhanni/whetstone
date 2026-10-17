import { checkCsrf, sessionCookie, type GuardRequest } from "./csrf-guard";

const TRUSTED = ["https://app.example.com"];
const check = (method: string, headers: GuardRequest["headers"]) =>
  checkCsrf({ method, headers }, TRUSTED).allowed;

/** Splits a Set-Cookie value into lowercase attribute strings, e.g. "samesite=lax". */
const attributesOf = (cookie: string) =>
  cookie.split(";").slice(1).map((part) => part.trim().toLowerCase());

describe("checkCsrf", () => {
  it("rejects cross-site PUT, PATCH and DELETE as well as POST", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(check(method, { "sec-fetch-site": "cross-site" })).toBe(false);
    }
  });

  it("compares Origin exactly, so a look-alike host is rejected", () => {
    // A prefix check accepts the first; a substring check (trusted.includes(origin) on a string)
    // accepts the second, which sits on someone else's registrable domain, example.co.
    expect(check("POST", { origin: "https://app.example.com.evil.test" })).toBe(false);
    expect(check("POST", { origin: "https://app.example.co" })).toBe(false);
  });

  it("accepts only same-origin from Sec-Fetch-Site", () => {
    for (const site of ["same-site", "cross-site", "none"]) {
      expect(check("POST", { "sec-fetch-site": site })).toBe(false);
    }
  });

  it("fails closed when neither Sec-Fetch-Site nor Origin is present", () => {
    expect(check("POST", {})).toBe(false);
  });

  it("allows a same-origin POST, and safe methods from anywhere", () => {
    expect(check("POST", { "sec-fetch-site": "same-origin", origin: "https://app.example.com" })).toBe(true);
    expect(check("GET", { "sec-fetch-site": "cross-site" })).toBe(true);
    expect(check("HEAD", {})).toBe(true);
    expect(check("OPTIONS", { "sec-fetch-site": "cross-site" })).toBe(true);
  });

  it("falls back to an exact Origin match when Sec-Fetch-Site is absent", () => {
    expect(check("POST", { origin: "https://app.example.com" })).toBe(true);
    expect(check("POST", { origin: "null" })).toBe(false);
  });
});

describe("sessionCookie", () => {
  it("sets HttpOnly, Secure and an explicit SameSite=Lax", () => {
    const attributes = attributesOf(sessionCookie("abc123", 3600));
    expect(attributes.includes("httponly")).toBe(true);
    expect(attributes.includes("secure")).toBe(true);
    expect(attributes.includes("samesite=lax")).toBe(true);
  });

  it("keeps the value, Path=/ and Max-Age", () => {
    const cookie = sessionCookie("abc123", 3600);
    expect(cookie.startsWith("session=abc123;")).toBe(true);
    const attributes = attributesOf(cookie);
    expect(attributes.includes("path=/")).toBe(true);
    expect(attributes.includes("max-age=3600")).toBe(true);
  });
});
