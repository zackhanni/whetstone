import { authenticate } from "./authenticate";
import { bytesToBase64url, makeToken } from "./jwt";

const SECRET = "test-secret";
const NOW = 1792219294; // 2026-10-17T06:41:34Z, in seconds
const options = { secret: SECRET, nowSeconds: NOW };
const HS256 = { alg: "HS256", typ: "JWT" };
const reader = { sub: "u_1", scope: "orders:read", iat: NOW, exp: NOW + 900 };

const b64json = (value: object) => bytesToBase64url(new TextEncoder().encode(JSON.stringify(value)));

describe("authenticate", () => {
  it("accepts a valid token that has the required scope", async () => {
    const token = await makeToken(HS256, reader, SECRET);
    const result = await authenticate(`Bearer ${token}`, "orders:read", options);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("u_1");
      expect(result.scopes.join(" ")).toBe("orders:read");
    }
  });

  it("challenges a request with no credentials: 401 and no error code", async () => {
    const result = await authenticate(undefined, "orders:read", options);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.wwwAuthenticate).toBe('Bearer realm="api"');
    }
  });

  it("accepts the auth scheme in any case", async () => {
    const token = await makeToken(HS256, reader, SECRET);
    for (const scheme of ["bearer", "BEARER"]) {
      const result = await authenticate(`${scheme} ${token}`, "orders:read", options);
      expect(`${scheme}: ${result.ok}`).toBe(`${scheme}: true`);
    }
  });

  it("rejects a token whose payload was edited after signing", async () => {
    const token = await makeToken(HS256, reader, SECRET);
    const [h, , s] = token.split(".");
    const forged = `${h}.${b64json({ ...reader, sub: "u_admin" })}.${s}`;
    const result = await authenticate(`Bearer ${forged}`, "orders:read", options);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.wwwAuthenticate).toBe('Bearer realm="api", error="invalid_token"');
    }
  });

  it("rejects an unsigned token that claims alg none", async () => {
    const unsigned = `${b64json({ alg: "none", typ: "JWT" })}.${b64json({ ...reader, sub: "u_admin" })}.`;
    const result = await authenticate(`Bearer ${unsigned}`, "orders:read", options);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.wwwAuthenticate).toBe('Bearer realm="api", error="invalid_token"');
    }
  });

  it("rejects a token signed with a different secret — before looking at its scope", async () => {
    const token = await makeToken(HS256, reader, "someone-elses-secret");
    // Asking for a scope the token lacks too: an unverified token is 401, never 403.
    for (const scope of ["orders:read", "orders:write"]) {
      const result = await authenticate(`Bearer ${token}`, scope, options);
      const outcome = result.ok ? "accepted" : `${result.status} ${result.wwwAuthenticate}`;
      expect(`${scope}: ${outcome}`).toBe(`${scope}: 401 Bearer realm="api", error="invalid_token"`);
    }
  });

  it("rejects a token from its exp second on, and one with no exp at all", async () => {
    const expiring = await makeToken(HS256, reader, SECRET);
    const atExp = await authenticate(`Bearer ${expiring}`, "orders:read", { ...options, nowSeconds: reader.exp });
    const noExp = await makeToken(HS256, { sub: "u_1", scope: "orders:read" }, SECRET);
    const withoutExp = await authenticate(`Bearer ${noExp}`, "orders:read", options);
    for (const result of [atExp, withoutExp]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(401);
        expect(result.wwwAuthenticate).toBe('Bearer realm="api", error="invalid_token"');
      }
    }
  });

  it("answers a valid token without the scope with 403 insufficient_scope", async () => {
    const token = await makeToken(HS256, reader, SECRET);
    const result = await authenticate(`Bearer ${token}`, "orders:write", options);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.wwwAuthenticate).toBe('Bearer realm="api", error="insufficient_scope", scope="orders:write"');
    }
  });

  it("treats a malformed token as invalid, not as a crash", async () => {
    for (const bad of ["abc", "a.b", "a.b.c.d", "!!.??.**"]) {
      const result = await authenticate(`Bearer ${bad}`, "orders:read", options);
      const outcome = result.ok ? "accepted" : `${result.status} ${result.wwwAuthenticate}`;
      expect(`${bad}: ${outcome}`).toBe(`${bad}: 401 Bearer realm="api", error="invalid_token"`);
    }
  });
});
