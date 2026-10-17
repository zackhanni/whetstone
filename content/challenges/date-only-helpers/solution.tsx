/**
 * Date-only helpers for a task tracker. A due date is a calendar date written "YYYY-MM-DD", not
 * an instant: "due 2026-03-10" means March 10 wherever the user is.
 *
 * The approach: treat a date-only value as UTC midnight of that day and do every calculation
 * with UTC methods. UTC has no daylight saving time, so every UTC day is exactly 24 hours and the
 * machine's time zone never enters the picture. Only isOverdue needs a zone, and it takes the
 * user's zone explicitly.
 */

const DAY_MS = 86_400_000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date written as YYYY-MM-DD. */
export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  // Date.UTC doesn't reject an impossible date, it rolls it over (Feb 30 → Mar 2). So build the
  // date and check that the same year, month and day come back out. (Years 0–99 fail this too,
  // because Date.UTC maps them to 1900–1999; no task tracker needs year 0026.)
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** UTC midnight of a date-only value, in epoch ms. Throws for a date that doesn't exist. */
function toUtcMidnight(day: string): number {
  if (!isValidDateOnly(day)) throw new RangeError(`not a calendar date: "${day}"`);
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return Date.UTC(year, month - 1, dayOfMonth);
}

/** The date-only value of a UTC-midnight timestamp: toISOString is always UTC. */
const fromUtcMidnight = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** The date `days` days after `day` (negative `days` goes back). */
export function addDays(day: string, days: number): string {
  // Every UTC day is exactly 24 hours, so this lands on midnight of the right day.
  return fromUtcMidnight(toUtcMidnight(day) + days * DAY_MS);
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  // Both are UTC midnights, so the difference is an exact multiple of 24 hours.
  return (toUtcMidnight(to) - toUtcMidnight(from)) / DAY_MS;
}

/** The calendar date on the wall clock in `timeZone` at the instant `now`, as YYYY-MM-DD. */
function todayIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Is a task due on `due` overdue at the instant `now`, for a user whose zone is `timeZone`? */
export function isOverdue(due: string, now: Date, timeZone: string): boolean {
  if (!isValidDateOnly(due)) throw new RangeError(`not a calendar date: "${due}"`);
  // Two YYYY-MM-DD strings compare correctly as strings. A date-only string and an ISO instant
  // don't: "2026-03-10" is a prefix of "2026-03-10T…", so it always sorts first.
  return todayIn(timeZone, now) > due;
}
