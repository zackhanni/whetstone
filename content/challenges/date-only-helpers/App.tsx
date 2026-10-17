import { addDays, daysBetween, isOverdue, isValidDateOnly } from "./due-dates";

/** Shows each helper's answer next to the expected one, so a wrong row stands out. */
function attempt(fn: () => unknown): string {
  try {
    return JSON.stringify(fn());
  } catch (e) {
    return e instanceof Error ? e.name : String(e);
  }
}

const rows: [string, () => unknown, string][] = [
  ['isValidDateOnly("2026-02-30")', () => isValidDateOnly("2026-02-30"), "false"],
  ['isValidDateOnly("2028-02-29")', () => isValidDateOnly("2028-02-29"), "true"],
  ['addDays("2026-02-30", 1)', () => addDays("2026-02-30", 1), "RangeError"],
  ['addDays("2026-11-01", 1)', () => addDays("2026-11-01", 1), '"2026-11-02"'],
  ['addDays("2026-03-09", -1)', () => addDays("2026-03-09", -1), '"2026-03-08"'],
  ['daysBetween("2026-03-07", "2026-03-09")', () => daysBetween("2026-03-07", "2026-03-09"), "2"],
  [
    'isOverdue("2026-03-10", 2026-03-10T13:00Z, New York)',
    () => isOverdue("2026-03-10", new Date("2026-03-10T13:00:00Z"), "America/New_York"),
    "false",
  ],
  [
    'isOverdue("2026-03-10", 2026-03-11T02:00Z, Tokyo)',
    () => isOverdue("2026-03-10", new Date("2026-03-11T02:00:00Z"), "Asia/Tokyo"),
    "true",
  ],
];

export default function App() {
  const machineZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Date-only helpers</h3>
      <p style={{ fontFamily: "system-ui, sans-serif", color: "#666" }}>
        This browser's time zone: {machineZone}. The DST rows use the US changes (March 8 and
        November 1, 2026), so they only go wrong in a zone that changes its clocks on those days,
        which is why the tests also run the helpers with local time disabled.
      </p>
      {rows.map(([label, fn, expected]) => {
        const actual = attempt(fn);
        return (
          <div key={label} style={{ color: actual === expected ? "#137333" : "#b00020", marginBottom: 6 }}>
            {label} → {actual} {actual === expected ? "✓" : `(expected ${expected})`}
          </div>
        );
      })}
    </div>
  );
}
