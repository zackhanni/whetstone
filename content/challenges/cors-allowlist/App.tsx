import { cors } from "./cors";
import { apiConfig, type IncomingRequest } from "./cors-types";

const requests: [string, IncomingRequest][] = [
  ["GET from the web app", { method: "GET", headers: { origin: "https://app.example.com" } }],
  ["GET from a lookalike", { method: "GET", headers: { origin: "https://app.example.com.evil.test" } }],
  ["GET from curl (no Origin)", { method: "GET", headers: {} }],
  [
    "Preflight: PUT with Authorization",
    {
      method: "OPTIONS",
      headers: {
        origin: "https://admin.example.com",
        "access-control-request-method": "PUT",
        "access-control-request-headers": "authorization,content-type",
      },
    },
  ],
  [
    "Preflight from evil.test",
    { method: "OPTIONS", headers: { origin: "https://evil.test", "access-control-request-method": "DELETE" } },
  ],
];

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>cors() — headers the API would send</h3>
      {requests.map(([label, request]) => {
        const decision = cors(request, apiConfig);
        const status = decision.kind === "preflight" ? `answer now: ${decision.status}` : "run the route";
        return (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ color: "#64748b" }}>
              {label} → {status}
            </div>
            {Object.entries(decision.headers).map(([name, value]) => (
              <div key={name}>
                {name}: {value}
              </div>
            ))}
            {Object.keys(decision.headers).length === 0 && <div>(no headers)</div>}
          </div>
        );
      })}
    </div>
  );
}
