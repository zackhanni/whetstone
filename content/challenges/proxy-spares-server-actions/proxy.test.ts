import { proxy } from "./proxy";
import { makeRequest } from "./fake-next-server";

describe("proxy", () => {
  it("sends a signed-out page visit to /login, remembering the path and query", () => {
    const result = proxy(makeRequest("GET", "/reports?year=2026"));
    expect(result.type).toBe("redirect");
    if (result.type === "redirect") {
      expect(result.status).toBe(307);
      expect(result.location).toBe("/login?next=%2Freports%3Fyear%3D2026");
    }
  });

  it("sends a signed-in visitor away from /login and /signup", () => {
    for (const path of ["/login", "/signup"]) {
      const result = proxy(makeRequest("GET", path, ["session"]));
      expect(result.type).toBe("redirect");
      if (result.type === "redirect") expect(result.location).toBe("/");
    }
  });

  it("lets the right visitors through", () => {
    expect(proxy(makeRequest("GET", "/reports", ["session"])).type).toBe("next");
    expect(proxy(makeRequest("GET", "/login")).type).toBe("next");
  });

  it("treats HEAD like GET", () => {
    expect(proxy(makeRequest("HEAD", "/reports")).type).toBe("redirect");
    expect(proxy(makeRequest("HEAD", "/login", ["session"])).type).toBe("redirect");
  });

  it("never redirects a Server Action's POST, signed in or not", () => {
    // createProfile() right after the browser-side sign-up set the cookie
    expect(proxy(makeRequest("POST", "/signup", ["session"])).type).toBe("next");
    // an action on a private page: the action checks the session itself
    expect(proxy(makeRequest("POST", "/settings")).type).toBe("next");
  });

  it("never redirects framework chunks or public files", () => {
    expect(proxy(makeRequest("GET", "/_next/static/chunks/app.js")).type).toBe("next");
    expect(proxy(makeRequest("GET", "/_next/image?url=%2Flogo.png&w=64&q=75")).type).toBe("next");
    expect(proxy(makeRequest("GET", "/logo.png")).type).toBe("next");
    expect(proxy(makeRequest("GET", "/favicon.ico")).type).toBe("next");
  });
});
