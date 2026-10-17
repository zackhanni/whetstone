import { decodeSegment, verifyHs256 } from "./jwt";

export type AuthResult =
  | { ok: true; userId: string; scopes: string[] }
  | { ok: false; status: 401 | 403; wwwAuthenticate: string };

type Claims = { sub?: string; scope?: string; exp?: number };

const REALM = 'Bearer realm="api"';

/**
 * Checks the Authorization header of one request. Four bugs, in the order worth fixing them:
 *   1. the signature is only checked when the token's own header says HS256
 *   2. `exp` is compared in the wrong unit, and a token with no `exp` sails through
 *   3. a valid token that lacks the scope gets 401 (try again) instead of 403 (no)
 *   4. the auth scheme is matched case-sensitively, so `bearer <token>` counts as no credentials
 */
export async function authenticate(
  authorization: string | undefined,
  requiredScope: string,
  options: { secret: string; nowSeconds: number },
): Promise<AuthResult> {
  const invalid: AuthResult = { ok: false, status: 401, wwwAuthenticate: `${REALM}, error="invalid_token"` };

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return { ok: false, status: 401, wwwAuthenticate: REALM };
  }
  const token = authorization.slice("Bearer ".length).trim();

  const [h, p, s, extra] = token.split(".");
  if (!h || !p || s === undefined || extra !== undefined) return invalid;

  const header = decodeSegment(h) as { alg?: string } | null;
  const claims = decodeSegment(p) as Claims | null;
  if (!header || !claims) return invalid;

  if (header.alg === "HS256" && !(await verifyHs256(`${h}.${p}`, s, options.secret))) return invalid;

  if (claims.exp !== undefined && claims.exp * 1000 < options.nowSeconds) return invalid;

  const scopes = (claims.scope ?? "").split(" ").filter(Boolean);
  if (!scopes.includes(requiredScope)) return invalid;

  return { ok: true, userId: claims.sub ?? "", scopes };
}
