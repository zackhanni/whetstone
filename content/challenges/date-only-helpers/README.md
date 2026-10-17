A task tracker stores due dates as calendar dates, `"YYYY-MM-DD"`: "due 2026-03-10" means March
10 for the user, wherever they are. `due-dates.ts` has the four helpers the app uses. They pass
a quick look, and the bugs only show up on certain dates, in certain time zones, or for input
nobody tried:

- **`isValidDateOnly`** checks the shape with a regex, so `"2026-02-30"` is "valid".
- **`addDays` / `daysBetween`** build local midnight (`new Date("2026-03-10T00:00")`) and add or
  divide by 24 hours. On a daylight saving time change a local day is 23 or 25 hours long, so
  in New York `addDays("2026-11-01", 1)` returns `"2026-11-01"` and
  `daysBetween("2026-03-07", "2026-03-09")` returns `1`. They also take `"2026-02-30"` without
  complaint.
- **`isOverdue`** compares the due date with `now.toISOString()` as strings. `"2026-03-10"` is a
  prefix of `"2026-03-10T13:00:00.000Z"`, so it always sorts first: every task is overdue on its
  own due date. It also ignores `timeZone`, but whether March 10 is over depends on whose
  calendar you ask.

**How the grader tests time zones.** A browser tab can't change its time zone, and in UTC, where
CI usually runs, local-time code gives the same answers as UTC code. So the DST tests only fail
if your machine's zone changes its clocks on one of the tested dates. To catch local-time
arithmetic everywhere, two tests run `addDays` and `daysBetween` inside `withoutLocalTime`
(`local-time-trap.ts`), which makes every local-time `Date` API throw for the duration of the
call, including in any helper they call (such as your `isValidDateOnly`): `getDate()`,
`getMonth()`, `setDate()`, `new Date(y, m, d)`, `new Date("2026-03-10T00:00")` and the like. UTC
APIs keep working. That's deliberately stricter than "right on this machine": a local-time version can
only be checked one zone at a time, while UTC arithmetic is the same computation on every
machine. `isOverdue` takes the zone as an argument, so its tests are the same everywhere.

## Hints

- A date-only value can be represented as **UTC midnight** of that day: `Date.UTC(y, m - 1, d)`.
  Every UTC day is exactly 24 hours, so adding `days * 86_400_000` lands on the right midnight,
  and `toISOString().slice(0, 10)` reads the date back.
- `Date.UTC(2026, 1, 30)` doesn't fail; it rolls over to March 2. Build the date, then check
  that the same year, month and day come back out of `getUTCFullYear()`, `getUTCMonth()` and
  `getUTCDate()`.
- Two `"YYYY-MM-DD"` strings compare correctly with `<` and `>`. So turn `now` into the user's
  calendar date first: `Intl.DateTimeFormat` with `timeZone`, then `formatToParts`, and assemble
  the `year`, `month` and `day` parts.
