import { validateBody } from "./validation-pipe";
import { createOrderSchema, type CreateOrder } from "./order-dto";

const run = (raw: Record<string, unknown>) => validateBody<CreateOrder>(createOrderSchema, raw);

describe("validateBody", () => {
  it("accepts a valid body and returns the parsed value", () => {
    const result = run({ customerId: "c_1", quantity: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.customerId).toBe("c_1");
      expect(result.value.quantity).toBe(2);
    }
  });

  it("strips properties the schema does not declare (whitelist)", () => {
    const result = run({ customerId: "c_1", quantity: 2, role: "admin", credits: 999 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const keys = Object.keys(result.value).sort();
      expect(keys.join(",")).toBe("customerId,quantity");
    }
  });

  it("coerces declared int and boolean fields from their string form (transform)", () => {
    const result = run({ customerId: "c_1", quantity: "3", express: "true" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.quantity).toBe(3);
      expect(typeof result.value.quantity).toBe("number");
      expect(result.value.express).toBe(true);
    }
  });

  it("coerces \"false\" to false, not to Boolean(\"false\") === true", () => {
    const result = run({ customerId: "c_1", quantity: "3", express: "false" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.express).toBe(false);
    }
  });

  it("reports every failing field, not just the first", () => {
    const result = run({ customerId: 42, quantity: 0, note: "far too long to fit" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBe(3);
    }
  });

  it("rejects a missing required field with status 400", () => {
    const result = run({ quantity: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.errors.some((e) => e.includes("customerId"))).toBe(true);
    }
  });

  it("leaves an absent optional field absent", () => {
    const result = run({ customerId: "c_1", quantity: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect("note" in result.value).toBe(false);
    }
  });

  it("rejects an int string that isn't a whole number, instead of NaN or a partial parse", () => {
    for (const quantity of ["two", "3abc"]) {
      const result = run({ customerId: "c_1", quantity });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.includes("quantity"))).toBe(true);
      }
    }
  });

  it("rejects a boolean string other than \"true\" / \"false\"", () => {
    const result = run({ customerId: "c_1", quantity: 2, express: "yes" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("express"))).toBe(true);
    }
  });
});
