`resolveOptions` turns a user's saved player settings into a complete set, filling in
`DEFAULTS` (in `types.ts`) for anything not set. Three people wrote it over time, each with a
different shorthand, and each shorthand has a hole:

- `||` falls back on every falsy value, and some of these settings are legitimately `0`, `""` or
  `false`.
- A destructuring default applies only to `undefined`. The API sends `null` for "not set".
- `{ ...DEFAULTS, ...saved }` copies a key that is *present* with the value `undefined` — which is
  what a cleared form field writes — straight over the default.

Some lines also tell the compiler to stop checking: the `!`s and an `as string`. None of them
changes what runs. TypeScript erases them all.

The preview resolves five real users' settings. Only one of them comes out right.

## Hints

- One operator handles every field correctly: it falls back on `null` and `undefined` and on
  nothing else.
- `?.` checks at runtime; `!` doesn't check at all.
- An optional callback can be called in one expression, without an `if`.
