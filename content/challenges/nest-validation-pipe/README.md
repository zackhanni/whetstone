`validation-pipe.ts` is a hand-rolled stand-in for
`new ValidationPipe({ whitelist: true, transform: true })`. `order-dto.ts` holds the "DTO":
the same metadata `@IsInt()` / `@Min(1)` / `@IsOptional()` would carry, as a plain object
(the sandbox can't run decorators).

```ts
createOrderSchema = {
  customerId: { type: "string" },
  quantity: { type: "int", min: 1, max: 100 },
  express: { type: "boolean", optional: true },
  note: { type: "string", optional: true, maxLength: 10 },
};
```

One thing the schema says that a bare class wouldn't: `int` and `boolean` fields also declare
their conversion from a string. In real Nest, `transform: true` on its own never converts a
body DTO's properties — `quantity: "3"` against `@IsInt()` is a 400 — so the DTO would carry
`@Type(() => Number)` on `quantity` and a `@Transform` on `express` (see the hints for why not
`@Type(() => Boolean)`).

It currently boots and "works" — which is the point. Four behaviours are missing, and each
one is a real production bug:

1. **whitelist** — the returned value is a copy of the raw body, so `role: "admin"` reaches
   the handler and any bulk update writes it.
2. **transform** — a form-encoded body sends every field as text, so `quantity` arrives as
   `"3"`; a field that declares its conversion should come out as `3`, not be rejected. A
   string that doesn't convert cleanly (`"two"`, `"3abc"`, or `"yes"` for a boolean) must
   still fail — never pass through as `NaN` or a guess.
3. **every failure** — it returns after the first problem, so the client fixes one field per
   round-trip.
4. **required fields** — it only inspects keys the client sent, so an omitted non-optional
   field is never checked. Missing input is a **400**, not a 500 later on.

The fix is mostly one decision: iterate the **schema**, not the body.

## Hints

- Coerce first, then run the existing `checkRule` on the result: an unconvertible string
  stays a string, and `checkRule` already reports it as the wrong type.
- `Boolean("false")` is `true`. That is exactly what `@Type(() => Boolean)` and
  `enableImplicitConversion` do to a `"false"` string, so accept only the two exact strings.
