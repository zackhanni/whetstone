import { decodeSegment, verifyHs256 } from "./jwt";

export type AuthResult =
  | { ok: true; userId: string; scopes: string[] }
  | { ok: false; status: 401 | 403; wwwAuthenticate: string };

type Claims = { sub?: string; scope?: string; exp?: number };

const REALM = 'Bearer realm="api"';

/** The one algorithm this API issues. The token's header is attacker-controlled, so it never chooses. */
const ACCEPTED_ALG = "HS256";

export async function authenticate(
  authorization: string | undefined,
  requiredScope: string,
  options: { secret: string; nowSeconds: number },
): Promise<AuthResult> {
  const invalid: AuthResult = { ok: false, status: 401, wwwAuthenticate: `${REALM}, error="invalid_token"` };

  // RFC 9110: the auth scheme is a case-insensitive token, so "bearer" and "BEARER" count too.
  const match = /^bearer\s+(\S+)\s*$/i.exec(authorization ?? "");
  // RFC 6750: when the request carried no credentials, challenge without an error code.
  if (!match) return { ok: false, status: 401, wwwAuthenticate: REALM };
  const token = match[1];

  const [h, p, s, extra] = token.split(".");
  if (!h || !p || !s || extra !== undefined) return invalid;

  // 1. Pin the algorithm before anything else; "none" (or anything unexpected) is just invalid.
  const header = decodeSegment(h) as { alg?: string } | null;
  if (!header || header.alg !== ACCEPTED_ALG) return invalid;

  // 2. Signature over the exact "header.payload" text. Until this passes, every claim is a guess.
  if (!(await verifyHs256(`${h}.${p}`, s, options.secret))) return invalid;

  // 3. exp is a NumericDate — SECONDS since the epoch — and the token is dead from that second on.
  const claims = decodeSegment(p) as Claims | null;
  if (!claims || typeof claims.exp !== "number" || options.nowSeconds >= claims.exp) return invalid;

  // 4. Authenticated. Now authorization: a real user without the right scope gets 403, not 401 —
  // refreshing the token would give the same identity and the same answer.
  const scopes = (claims.scope ?? "").split(" ").filter(Boolean);
  if (!scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      wwwAuthenticate: `${REALM}, error="insufficient_scope", scope="${requiredScope}"`,
    };
  }

  return { ok: true, userId: claims.sub ?? "", scopes };
}
