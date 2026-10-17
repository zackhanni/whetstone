import { proxy } from "./proxy";
import { makeRequest } from "./fake-next-server";

const cases: { label: string; method: string; path: string; cookies: string[] }[] = [
  { label: "signed out, visits /reports", method: "GET", path: "/reports?year=2026", cookies: [] },
  { label: "signed in, visits /signup", method: "GET", path: "/signup", cookies: ["session"] },
  { label: "createProfile() action right after sign-up", method: "POST", path: "/signup", cookies: ["session"] },
  { label: "signed out, the login page's CSS chunk", method: "GET", path: "/_next/static/css/app.css", cookies: [] },
  { label: "signed out, /logo.png", method: "GET", path: "/logo.png", cookies: [] },
];

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>What proxy.ts answers</h3>
      {cases.map((c) => {
        const result = proxy(makeRequest(c.method, c.path, c.cookies));
        return (
          <div key={c.label} style={{ marginBottom: 10 }}>
            <div style={{ color: "#666" }}>{c.label}</div>
            <div>
              {c.method} {c.path} →{" "}
              {result.type === "next" ? "passes through" : `${result.status} → ${result.location}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
