import { sharedCacheDecision } from "./shared-cache";

const cases: { label: string; auth?: boolean; cacheControl: string; age: number }[] = [
  { label: "public JSON, 5 min old", cacheControl: "public, max-age=0, s-maxage=86400", age: 300 },
  { label: "a dashboard", cacheControl: "private, max-age=0", age: 0 },
  { label: "settings, 10 s old", cacheControl: "max-age=600, no-cache", age: 10 },
  { label: "catalog, 2 min old", cacheControl: "max-age=60, stale-while-revalidate=300", age: 120 },
  { label: "answer to a request with Authorization", auth: true, cacheControl: "max-age=600", age: 10 },
  { label: "Next.js dynamic page", cacheControl: "private, no-cache, no-store, max-age=0, must-revalidate", age: 0 },
];

export default function App() {
  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>What the CDN does</h3>
      {cases.map((c) => {
        const request = { method: "GET", headers: c.auth ? { authorization: "Bearer x" } : {} };
        const decision = sharedCacheDecision(request, { headers: { "cache-control": c.cacheControl } }, c.age);
        return (
          <div key={c.label} style={{ marginBottom: 10 }}>
            <div style={{ color: "#666" }}>{c.label}</div>
            <div>
              Cache-Control: {c.cacheControl} → <strong>{decision}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}
