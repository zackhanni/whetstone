import { useEffect, useState } from "react";
import { authenticate, type AuthResult } from "./authenticate";
import { bytesToBase64url, makeToken } from "./jwt";

const SECRET = "preview-secret";
const NOW = 1792219294; // fixed "now", in seconds, so the preview is stable
const b64json = (value: object) => bytesToBase64url(new TextEncoder().encode(JSON.stringify(value)));

async function scenarios(): Promise<[string, string | undefined, string][]> {
  const reader = { sub: "u_1", scope: "orders:read", iat: NOW, exp: NOW + 900 };
  const good = await makeToken({ alg: "HS256", typ: "JWT" }, reader, SECRET);
  const unsigned = `${b64json({ alg: "none" })}.${b64json({ ...reader, sub: "u_admin" })}.`;
  const expired = await makeToken({ alg: "HS256" }, { ...reader, exp: NOW - 60 }, SECRET);
  return [
    ["valid token, GET /orders", `Bearer ${good}`, "orders:read"],
    ["no Authorization header", undefined, "orders:read"],
    ["lowercase scheme", `bearer ${good}`, "orders:read"],
    ['alg "none", sub edited to u_admin', `Bearer ${unsigned}`, "orders:read"],
    ["expired a minute ago", `Bearer ${expired}`, "orders:read"],
    ["valid token, POST /orders needs orders:write", `Bearer ${good}`, "orders:write"],
  ];
}

const describeResult = (r: AuthResult) =>
  r.ok ? `200 — user ${r.userId}` : `${r.status} — WWW-Authenticate: ${r.wwwAuthenticate}`;

export default function App() {
  const [rows, setRows] = useState<[string, string][]>([]);

  useEffect(() => {
    let cancelled = false;
    scenarios()
      .then((list) =>
        Promise.all(
          list.map(async ([label, header, scope]) => {
            const result = await authenticate(header, scope, { secret: SECRET, nowSeconds: NOW });
            return [label, describeResult(result)] as [string, string];
          }),
        ),
      )
      .then((result) => {
        if (!cancelled) setRows(result);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, padding: 12 }}>
      <h3 style={{ fontFamily: "system-ui, sans-serif" }}>authenticate() — what each request gets</h3>
      {rows.length === 0 && <div>running…</div>}
      {rows.map(([label, outcome]) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={{ color: "#64748b" }}>{label}</div>
          <div>{outcome}</div>
        </div>
      ))}
    </div>
  );
}
