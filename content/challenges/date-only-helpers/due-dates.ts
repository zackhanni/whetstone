/**
 * Date-only helpers for a task tracker. A due date is a calendar date written "YYYY-MM-DD", not
 * an instant: "due 2026-03-10" means March 10 wherever the user is.
 *
 * Four bugs, in the order worth fixing them:
 *   1. isValidDateOnly checks the shape only, so "2026-02-30" passes.
 *   2. addDays and daysBetween accept a date that doesn't exist and quietly roll it over.
 *   3. addDays and daysBetween do their arithmetic in the machine's LOCAL time, where a day is
 *      not always 24 hours.
 *   4. isOverdue compares a date-only string with an ISO instant string, and ignores the
 *      user's time zone.
 */

const DAY_MS = 86_400_000;
const pad = (n: number): string => String(n).padStart(2, "0");

/** True for a real calendar date written as YYYY-MM-DD. */
export function isValidDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** The date `days` days after `day` (negative `days` goes back). */
export function addDays(day: string, days: number): string {
  const midnight = new Date(`${day}T00:00`);
  const moved = new Date(midnight.getTime() + days * DAY_MS);
  return `${moved.getFullYear()}-${pad(moved.getMonth() + 1)}-${pad(moved.getDate())}`;
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00`).getTime();
  const end = new Date(`${to}T00:00`).getTime();
  return Math.floor((end - start) / DAY_MS);
}

/** Is a task due on `due` overdue at the instant `now`, for a user whose zone is `timeZone`? */
export function isOverdue(due: string, now: Date, timeZone: string): boolean {
  return now.toISOString() > due;
}
