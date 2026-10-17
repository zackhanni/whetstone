/**
 * The stand-in for a DTO class + its decorators. Nest reads `@IsInt()`, `@Min(1)`,
 * `@IsOptional()` as runtime metadata; here that metadata is a plain object, so the challenge
 * is about the *pipe's* behaviour rather than about decorators (which the sandbox can't run).
 *
 * Read-only support file — the pipe lives in validation-pipe.ts.
 */
export type FieldRule = {
  type: "string" | "int" | "boolean";
  optional?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
};

export type Schema = Record<string, FieldRule>;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; errors: string[] };

/**
 * class CreateOrderDto { @IsString() customerId; @Type(() => Number) @IsInt() @Min(1) @Max(100) quantity; … }
 * `int` and `boolean` here include the field's conversion from a string: in Nest,
 * `transform: true` alone never converts a body DTO's properties.
 */
export const createOrderSchema: Schema = {
  customerId: { type: "string" },
  quantity: { type: "int", min: 1, max: 100 },
  express: { type: "boolean", optional: true },
  note: { type: "string", optional: true, maxLength: 10 },
};

export type CreateOrder = {
  customerId: string;
  quantity: number;
  express?: boolean;
  note?: string;
};
