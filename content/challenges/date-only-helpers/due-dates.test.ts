import { addDays, daysBetween, isOverdue, isValidDateOnly } from "./due-dates";
import { withoutLocalTime } from "./local-time-trap";

/** "RangeError" if `fn` throws one; otherwise says what happened instead, for a readable failure. */
const outcome = (fn: () => unknown): string => {
  try {
    return `no error, returned ${JSON.stringify(fn())}`;
  } catch (e) {
    return e instanceof Error ? e.name : String(e);
  }
};

// Daylight saving time changes in 2026, as [day before, day after] pairs around each change:
// New York and the US (Mar 8, Nov 1), the EU (Mar 29, Oct 25), Sydney (Apr 5, Oct 4) and
// Auckland (Apr 5, Sep 27). Local-time arithmetic goes wrong on these days in those zones.
const DST_CHANGES = [
  ["2026-03-07", "2026-03-09"],
  ["2026-10-31", "2026-11-02"],
  ["2026-03-28", "2026-03-30"],
  ["2026-10-24", "2026-10-26"],
  ["2026-04-04", "2026-04-06"],
  ["2026-10-03", "2026-10-05"],
  ["2026-09-26", "2026-09-28"],
];

describe("isValidDateOnly", () => {
  it("accepts real calendar dates, including February 29 in a leap year", () => {
    for (const day of ["2026-03-10", "2026-01-01", "2026-12-31", "2028-02-29"]) {
      expect(`${day}: ${isValidDateOnly(day)}`).toBe(`${day}: true`);
    }
  });

  it("rejects dates that don't exist, even when the shape is right", () => {
    for (const day of ["2026-02-30", "2026-02-29", "2026-04-31", "2026-13-01", "2026-00-10", "2026-03-00"]) {
      expect(`${day}: ${isValidDateOnly(day)}`).toBe(`${day}: false`);
    }
  });

  it("rejects strings that aren't YYYY-MM-DD", () => {
    for (const day of ["2026-3-5", "2026-03-10T00:00", "10/03/2026", " 2026-03-10", ""]) {
      expect(`"${day}": ${isValidDateOnly(day)}`).toBe(`"${day}": false`);
    }
  });
});

describe("addDays", () => {
  it("crosses month ends, year ends and leap days", () => {
    expect(addDays("2026-03-10", 1)).toBe("2026-03-11");
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is unaffected by daylight saving time changes", () => {
    for (const [before, after] of DST_CHANGES) {
      expect(addDays(before, 2)).toBe(after);
      expect(addDays(after, -2)).toBe(before);
      expect(addDays(addDays(before, 1), 1)).toBe(after);
      expect(addDays(addDays(after, -1), -1)).toBe(before);
    }
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    // A year later, across both of a zone's changes.
    expect(addDays("2026-03-10", 365)).toBe("2027-03-10");
  });

  it("throws a RangeError for a date that doesn't exist, instead of rolling it over", () => {
    expect(outcome(() => addDays("2026-02-30", 1))).toBe("RangeError");
    expect(outcome(() => addDays("2026-13-01", 1))).toBe("RangeError");
  });

  it("never reads the machine's time zone", () => {
    // Only the helper runs with local time disabled; the assertion runs afterwards.
    const results = withoutLocalTime("addDays", () => [
      addDays("2026-03-07", 2),
      addDays("2026-11-02", -1),
      addDays("2026-12-31", 1),
    ]);
    expect(results.join(", ")).toBe("2026-03-09, 2026-11-01, 2027-01-01");
  });
});

describe("daysBetween", () => {
  it("counts whole calendar days, forwards and backwards", () => {
    expect(daysBetween("2026-03-10", "2026-03-10")).toBe(0);
    expect(daysBetween("2026-03-10", "2026-03-17")).toBe(7);
    expect(daysBetween("2026-03-17", "2026-03-10")).toBe(-7);
    expect(daysBetween("2026-12-25", "2027-01-01")).toBe(7);
    expect(daysBetween("2028-02-01", "2028-03-01")).toBe(29);
  });

  it("counts a daylight saving day as one calendar day", () => {
    for (const [before, after] of DST_CHANGES) {
      expect(`${before} → ${after}: ${daysBetween(before, after)}`).toBe(`${before} → ${after}: 2`);
      expect(`${after} → ${before}: ${daysBetween(after, before)}`).toBe(`${after} → ${before}: -2`);
    }
  });

  it("throws a RangeError when either date doesn't exist", () => {
    expect(outcome(() => daysBetween("2026-02-29", "2026-03-01"))).toBe("RangeError");
    expect(outcome(() => daysBetween("2026-03-01", "2026-04-31"))).toBe("RangeError");
  });

  it("counts without reading the machine's time zone", () => {
    const results = withoutLocalTime("daysBetween", () => [
      daysBetween("2026-03-07", "2026-03-09"),
      daysBetween("2026-11-02", "2026-10-31"),
    ]);
    expect(results.join(", ")).toBe("2, -2");
  });
});

describe("isOverdue", () => {
  const NEW_YORK = "America/New_York";
  const TOKYO = "Asia/Tokyo";

  it("is not overdue during the due date itself, and is overdue the day after", () => {
    // New York is UTC−4 after March 8, 2026.
    const at = (iso: string) => isOverdue("2026-03-10", new Date(iso), NEW_YORK);
    expect(`09:00 on March 10: ${at("2026-03-10T13:00:00Z")}`).toBe("09:00 on March 10: false");
    expect(`16:00 on March 10: ${at("2026-03-10T20:00:00Z")}`).toBe("16:00 on March 10: false");
    expect(`11:00 on March 9: ${at("2026-03-09T15:00:00Z")}`).toBe("11:00 on March 9: false");
    expect(`11:00 on March 11: ${at("2026-03-11T15:00:00Z")}`).toBe("11:00 on March 11: true");
  });

  it("decides what day it is in the user's time zone, not the machine's or UTC", () => {
    // 02:00 UTC on March 11 is still 22:00 on March 10 in New York, but 11:00 on March 11 in Tokyo.
    const now = new Date("2026-03-11T02:00:00Z");
    expect(`New York: ${isOverdue("2026-03-10", now, NEW_YORK)}`).toBe("New York: false");
    expect(`Tokyo: ${isOverdue("2026-03-10", now, TOKYO)}`).toBe("Tokyo: true");
    // 16:00 UTC on March 10: noon in New York, already 01:00 on March 11 in Tokyo.
    const later = new Date("2026-03-10T16:00:00Z");
    expect(`New York: ${isOverdue("2026-03-10", later, NEW_YORK)}`).toBe("New York: false");
    expect(`Tokyo: ${isOverdue("2026-03-10", later, TOKYO)}`).toBe("Tokyo: true");
  });
});
