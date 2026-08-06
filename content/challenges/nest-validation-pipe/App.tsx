import { validateBody } from "./validation-pipe";
import { createOrderSchema, type CreateOrder } from "./order-dto";

const bodies: Record<string, Record<string, unknown>> = {
  "valid": { customerId: "c_1", quantity: 2 },
  "extra keys (should be stripped)": { customerId: "c_1", quantity: 2, role: "admin" },
  "strings from a form (should coerce)": { customerId: "c_1", quantity: "3", express: "true" },
  "three problems (should list all 3)": { customerId: 42, quantity: 0, note: "far too long to fit" },
  "missing customerId (should be 400)": { quantity: 2 },
};

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>POST /orders — pipe output</h3>
      {Object.entries(bodies).map(([label, raw]) => {
        const result = validateBody<CreateOrder>(createOrderSchema, raw);
        return (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ color: "#666" }}>{label}</div>
            <div>in: {JSON.stringify(raw)}</div>
            <div style={{ color: result.ok ? "#137333" : "#b00020" }}>
              out: {result.ok ? `200 ${JSON.stringify(result.value)}` : `${result.status} ${JSON.stringify(result.errors)}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
