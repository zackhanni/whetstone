import { feedLine, parseEvent } from "./events";

const bodies: Record<string, unknown> = {
  "signup": { kind: "signup", userId: "u1", email: "ada@example.com" },
  "payment": { kind: "payment", userId: "u1", amountCents: 1200 },
  "payment, amount sent as a string": { kind: "payment", userId: "u2", amountCents: "1200" },
  "cancel": { kind: "cancel", userId: "u3", reason: "too expensive" },
  "a kind added by the sender last week": { kind: "refund", userId: "u4", amountCents: 500 },
  "empty body (null)": null,
};

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>Webhook bodies → activity feed</h3>
      {Object.entries(bodies).map(([label, body]) => {
        let out: string;
        try {
          const result = parseEvent(body);
          out = result.ok ? `feed: ${feedLine(result.event)}` : `rejected: ${result.error}`;
        } catch (err) {
          out = `threw: ${(err as Error).message}`;
        }
        return (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ color: "#666" }}>{label}</div>
            <div>{out}</div>
          </div>
        );
      })}
    </div>
  );
}
