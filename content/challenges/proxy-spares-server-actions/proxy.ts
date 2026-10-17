import { NextResponse, type ProxyRequest, type ProxyResult } from "./fake-next-server";

/**
 * Auth redirects for an internal tool: every page needs a session except /login and /signup.
 * There is no `matcher`, so this runs for EVERY request: page visits, Server Action calls (a POST
 * to the page that renders the action) and the framework's own files.
 *
 * Two bugs, in the order worth fixing them:
 *   1. Server Actions — it redirects whatever the method. The sign-up form signs the user in from
 *      the browser (setting the "session" cookie), then calls the createProfile() action, which
 *      POSTs to /signup… and gets a 307 instead of running.
 *   2. Static files — `/_next/…` chunks and public files like `/logo.png` are sent to /login too,
 *      so a signed-out visitor gets a login page with no CSS or JavaScript.
 */
const PUBLIC_PAGES = ["/login", "/signup"];

export function proxy(request: ProxyRequest): ProxyResult {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has("session");
  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  if (isPublicPage && signedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicPage && !signedIn) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}
