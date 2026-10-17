import { checkCsrf, sessionCookie, type GuardRequest } from "./csrf-guard";

const TRUSTED = ["https://app.example.com"];

const requests: { label: string; req: GuardRequest }[] = [
  { label: "our own form (same-origin POST)", req: { method: "POST", headers: { "sec-fetch-site": "same-origin" } } },
  { label: "evil.example deletes an account", req: { method: "DELETE", headers: { "sec-fetch-site": "cross-site" } } },
  { label: "user-content subdomain posts", req: { method: "POST", headers: { "sec-fetch-site": "same-site" } } },
  { label: "old browser, look-alike origin", req: { method: "POST", headers: { origin: "https://app.example.com.evil.test" } } },
  { label: "old browser, our origin", req: { method: "POST", headers: { origin: "https://app.example.com" } } },
  { label: "no headers at all", req: { method: "POST", headers: {} } },
  { label: "cross-site link click (GET)", req: { method: "GET", headers: { "sec-fetch-site": "cross-site" } } },
];

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, padding: 12 }}>
      <table style={{ borderCollapse: "collapse" }}>
        <tbody>
          {requests.map(({ label, req }) => {
            const result = checkCsrf(req, TRUSTED);
            return (
              <tr key={label}>
                <td style={{ padding: "2px 12px 2px 0" }}>{label}</td>
                <td style={{ color: result.allowed ? "#137333" : "#b00020", fontFamily: "ui-monospace, monospace" }}>
                  {result.allowed ? "allowed" : `rejected (${result.reason})`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={{ fontFamily: "ui-monospace, monospace" }}>Set-Cookie: {sessionCookie("abc123", 3600)}</p>
    </div>
  );
}
