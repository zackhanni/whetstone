/**
 * A stand-in for the parts of `next/server` a proxy touches. In a real app `proxy.ts` receives a
 * `NextRequest` and returns `NextResponse.next()` or `NextResponse.redirect(url)`; the sandbox
 * can't run Next, so these mirror that shape: `request.method`, `request.url`,
 * `request.nextUrl.pathname` / `.search`, `request.cookies.has(name)`, and a redirect that
 * defaults to 307 like the real one.
 *
 * Read-only support file — the logic lives in proxy.ts.
 */
export type ProxyRequest = {
  method: string;
  url: string;
  nextUrl: { pathname: string; search: string };
  cookies: { has(name: string): boolean };
};

export type ProxyResult = { type: "next" } | { type: "redirect"; status: 307; location: string };

export const NextResponse = {
  next(): ProxyResult {
    return { type: "next" };
  },
  redirect(url: URL): ProxyResult {
    return { type: "redirect", status: 307, location: url.pathname + url.search };
  },
};

/** Builds a request the way a browser would send it to https://app.example. */
export function makeRequest(method: string, path: string, cookieNames: string[] = []): ProxyRequest {
  const url = new URL(path, "https://app.example");
  const cookies = new Set(cookieNames);
  return {
    method,
    url: url.href,
    nextUrl: { pathname: url.pathname, search: url.search },
    cookies: { has: (name) => cookies.has(name) },
  };
}
