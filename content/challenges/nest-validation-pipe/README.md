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

It currently boots and "works" — which is the point. Four behaviours are missing, and each
one is a real production bug:

1. **whitelist** — the returned value is a copy of the raw body, so `role: "admin"` reaches
   the handler and any bulk update writes it.
2. **transform** — a form/query sends `quantity: "3"`; a field declared `int` should be
   coerced to `3`, not rejected. A string that isn't a number must still fail (no `NaN`).
3. **every failure** — it returns after the first problem, so the client fixes one field per
   round-trip.
4. **required fields** — it only inspects keys the client sent, so an omitted non-optional
   field is never checked. Missing input is a **400**, not a 500 later on.

The fix is mostly one decision: iterate the **schema**, not the body.
