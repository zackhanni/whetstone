import { cors } from "./cors";
import type { CorsConfig, IncomingRequest } from "./cors-types";

const config: CorsConfig = {
  allowedOrigins: ["https://app.example.com", "https://admin.example.com"],
  allowCredentials: true,
  allowedMethods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["authorization", "content-type"],
  maxAgeSeconds: 600,
};

const get = (origin?: string): IncomingRequest => ({ method: "GET", headers: { origin } });
const preflight = (origin: string, method = "PUT", requested = "authorization,content-type"): IncomingRequest => ({
  method: "OPTIONS",
  headers: { origin, "access-control-request-method": method, "access-control-request-headers": requested },
});
const varyHasOrigin = (headers: Record<string, string>) =>
  (headers["vary"] ?? "").split(",").some((v) => v.trim().toLowerCase() === "origin");

describe("cors", () => {
  it("echoes an allowed origin exactly, with credentials allowed", () => {
    const decision = cors(get("https://app.example.com"), config);
    expect(decision.kind).toBe("pass");
    expect(decision.headers["access-control-allow-origin"]).toBe("https://app.example.com");
    expect(decision.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("gives lookalike origins nothing", () => {
    for (const origin of [
      "https://app.example.com.evil.test",
      "https://app.example.com:8443",
      "http://app.example.com",
      "https://evil.test",
    ]) {
      const decision = cors(get(origin), config);
      expect(`${origin}: ${decision.headers["access-control-allow-origin"] ?? "(none)"}`).toBe(`${origin}: (none)`);
    }
  });

  it("marks every response as varying by Origin", () => {
    const allowed = cors(get("https://app.example.com"), config);
    const refused = cors(get("https://evil.test"), config);
    const noOrigin = cors(get(undefined), config);
    const refusedPreflight = cors(preflight("https://evil.test"), config);
    const results = [allowed, refused, noOrigin, refusedPreflight].map((d) => varyHasOrigin(d.headers));
    expect(results.join(" ")).toBe("true true true true");
  });

  it("answers an allowed preflight with 204 and explicit methods and headers", () => {
    const decision = cors(preflight("https://admin.example.com"), config);
    expect(decision.kind).toBe("preflight");
    if (decision.kind === "preflight") {
      expect(decision.status).toBe(204);
      expect(decision.headers["access-control-allow-origin"]).toBe("https://admin.example.com");
      expect(decision.headers["access-control-allow-credentials"]).toBe("true");
      expect(decision.headers["access-control-allow-methods"]).toBe("GET, POST, PUT, DELETE");
      expect(decision.headers["access-control-allow-headers"]).toBe("authorization, content-type");
      expect(decision.headers["access-control-max-age"]).toBe("600");
    }
  });

  it("refuses a preflight from an origin that isn't listed: 403 and no grant", () => {
    const decision = cors(preflight("https://evil.test"), config);
    expect(decision.kind).toBe("preflight");
    if (decision.kind === "preflight") {
      expect(decision.status).toBe(403);
      expect(decision.headers["access-control-allow-origin"]).toBe(undefined);
      expect(decision.headers["access-control-allow-methods"]).toBe(undefined);
    }
  });

  it("adds no CORS grant to a request without an Origin header", () => {
    const decision = cors(get(undefined), config);
    expect(decision.kind).toBe("pass");
    const granted = Object.keys(decision.headers).filter((h) => h.startsWith("access-control-"));
    expect(granted.length).toBe(0);
  });

  it("treats an OPTIONS without Access-Control-Request-Method as an ordinary request", () => {
    const decision = cors({ method: "OPTIONS", headers: { origin: "https://app.example.com" } }, config);
    expect(decision.kind).toBe("pass");
  });

  it("omits Allow-Credentials when the config doesn't allow credentials", () => {
    const decision = cors(get("https://app.example.com"), { ...config, allowCredentials: false });
    expect(decision.headers["access-control-allow-credentials"]).toBe(undefined);
  });
});
