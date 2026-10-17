/**
 * Why this file exists: the grader can't change your browser's time zone, and in UTC (where CI
 * usually runs) local-time code gives the same answers as UTC code. So instead of moving the
 * machine, the grader unplugs its local clock. While `withoutLocalTime(label, fn)` runs:
 *
 * - every `Date` method that reads or writes local time throws (`getDate`, `getMonth`,
 *   `getFullYear`, `getDay`, `getHours`, `setDate`, `setMonth`, `getTimezoneOffset`, `toString`,
 *   and the `toLocale…` methods unless you pass a `timeZone` option);
 * - so do the ways of BUILDING a Date from local time: `new Date(year, month, day, …)`, and a
 *   string that has a time but no `Z`/offset (`new Date("2026-03-10T00:00")`), or isn't ISO at all;
 * - so does `new Intl.DateTimeFormat(…)` without a `timeZone` option.
 *
 * Everything that only uses UTC keeps working: `Date.UTC`, `new Date(ms)`, `new Date("2026-03-10")`
 * (a date-only ISO string is UTC), the `getUTC…`/`setUTC…` methods, `toISOString`, `Date.now`.
 *
 * Read-only support file: you don't need to edit it.
 */

const LOCAL_METHODS = [
  "getFullYear", "getMonth", "getDate", "getDay", "getHours", "getMinutes", "getSeconds",
  "getMilliseconds", "getTimezoneOffset", "setFullYear", "setMonth", "setDate", "setHours",
  "setMinutes", "setSeconds", "setMilliseconds", "toString", "toDateString", "toTimeString",
  "getYear", "setYear", // legacy (Annex B), but local time too
] as const;

/** Fine when a `timeZone` option is passed; local otherwise. */
const LOCALE_METHODS = ["toLocaleString", "toLocaleDateString", "toLocaleTimeString"] as const;

/** A string `Date` reads as UTC or as an exact instant: date-only ISO, or ending in Z / ±hh:mm. */
const UTC_STRING = /^(\d{4}(-\d{2}(-\d{2})?)?|\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2}))$/;

export function withoutLocalTime<T>(label: string, fn: () => T): T {
  const fail = (what: string): never => {
    throw new Error(
      `${label} used local time: ${what}. Date-only math must not depend on the machine's time zone; use Date.UTC and the getUTC…/setUTC… methods.`,
    );
  };

  const RealDate = Date;
  const RealDateTimeFormat = Intl.DateTimeFormat;
  const proto = RealDate.prototype as unknown as Record<string, unknown>;
  const saved = new Map<string, unknown>();

  for (const name of LOCAL_METHODS) {
    saved.set(name, proto[name]);
    proto[name] = () => fail(`Date#${name}() reads the machine's time zone`);
  }
  for (const name of LOCALE_METHODS) {
    const original = proto[name] as (this: Date, ...args: unknown[]) => string;
    saved.set(name, original);
    proto[name] = function (this: Date, locales?: unknown, options?: { timeZone?: string }) {
      if (!options?.timeZone) fail(`Date#${name}() without a timeZone option uses the machine's zone`);
      return original.call(this, locales, options);
    };
  }

  const checkDateArgs = (args: unknown[]): void => {
    if (args.length >= 2) fail("new Date(year, month, …) builds a LOCAL date-time");
    if (typeof args[0] === "string" && !UTC_STRING.test(args[0]))
      fail(`new Date("${args[0]}") is read as local time (or guessed by the engine)`);
  };

  const TrappedDate = new Proxy(RealDate, {
    construct(target, args, newTarget) {
      checkDateArgs(args);
      return Reflect.construct(target, args, newTarget === TrappedDate ? target : newTarget);
    },
    apply() {
      return fail("Date() called without new returns the local time as a string");
    },
    get(target, key, receiver) {
      if (key === "parse")
        return (s: string) => {
          checkDateArgs([s]);
          return target.parse(s);
        };
      return Reflect.get(target, key, receiver);
    },
  });

  const TrappedDateTimeFormat = new Proxy(RealDateTimeFormat, {
    construct(target, args) {
      const options = args[1] as { timeZone?: string } | undefined;
      if (!options?.timeZone) fail("new Intl.DateTimeFormat() without a timeZone option uses the machine's zone");
      return Reflect.construct(target, args);
    },
    apply(target, thisArg, args) {
      const options = args[1] as { timeZone?: string } | undefined;
      if (!options?.timeZone) fail("Intl.DateTimeFormat() without a timeZone option uses the machine's zone");
      return Reflect.apply(target, thisArg, args);
    },
  });

  const globals = globalThis as unknown as { Date: DateConstructor };
  globals.Date = TrappedDate;
  (Intl as { DateTimeFormat: typeof Intl.DateTimeFormat }).DateTimeFormat = TrappedDateTimeFormat;
  try {
    return fn();
  } finally {
    globals.Date = RealDate;
    (Intl as { DateTimeFormat: typeof Intl.DateTimeFormat }).DateTimeFormat = RealDateTimeFormat;
    for (const [name, original] of saved) proto[name] = original;
  }
}
