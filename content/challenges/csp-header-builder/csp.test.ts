import { cspForRequest, createNonce, type CspOptions } from "./csp";
import { parseCsp } from "./csp-parse";

const options: CspOptions = {
  scriptOrigins: ["https://js.stripe.com"],
  connectOrigins: ["https://api.stripe.com"],
  reportTo: "csp-endpoint",
  dev: false,
};

const directivesOf = (opts: CspOptions) => parseCsp(cspForRequest(opts).header);

describe("cspForRequest", () => {
  it("allows inline script only through this response's nonce, never 'unsafe-inline'", () => {
    const { nonce, header } = cspForRequest(options);
    const scriptSrc = parseCsp(header)["script-src"] ?? [];
    expect(scriptSrc.includes(`'nonce-${nonce}'`)).toBe(true);
    expect(scriptSrc.includes("'unsafe-inline'")).toBe(false);
  });

  it("issues a different nonce for every response", () => {
    const first = cspForRequest(options);
    const second = cspForRequest(options);
    expect(first.nonce === second.nonce).toBe(false);
  });

  it("sets object-src 'none' and an explicit base-uri", () => {
    const directives = directivesOf(options);
    expect((directives["object-src"] ?? []).join(" ")).toBe("'none'");
    const baseUri = (directives["base-uri"] ?? []).join(" ");
    expect(baseUri === "'none'" || baseUri === "'self'").toBe(true);
  });

  it("allows 'unsafe-eval' in development only", () => {
    const prod = directivesOf({ ...options, dev: false })["script-src"] ?? [];
    const dev = directivesOf({ ...options, dev: true })["script-src"] ?? [];
    expect(prod.includes("'unsafe-eval'")).toBe(false);
    expect(dev.includes("'unsafe-eval'")).toBe(true);
  });

  it("keeps the configured origins, the framing ban and report-to", () => {
    const directives = directivesOf(options);
    const scriptSrc = directives["script-src"] ?? [];
    expect(scriptSrc.includes("'self'")).toBe(true);
    expect(scriptSrc.includes("https://js.stripe.com")).toBe(true);
    expect((directives["connect-src"] ?? []).join(" ")).toBe("'self' https://api.stripe.com");
    expect((directives["frame-ancestors"] ?? []).join(" ")).toBe("'none'");
    expect((directives["report-to"] ?? []).join(" ")).toBe("csp-endpoint");
  });

  it("creates base64 nonces carrying at least 128 bits", () => {
    // Check the nonce each response actually gets, not just the helper: a per-call
    // Math.random() string is fresh every time but is neither base64 nor 128 bits.
    for (const nonce of [createNonce(), cspForRequest(options).nonce]) {
      expect(/^[A-Za-z0-9+/]+={0,2}$/.test(nonce)).toBe(true);
      expect(atob(nonce).length >= 16).toBe(true);
    }
  });
});
