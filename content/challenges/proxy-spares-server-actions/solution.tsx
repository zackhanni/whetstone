import { NextResponse, type ProxyRequest, type ProxyResult } from "./fake-next-server";

/**
 * Auth redirects for an internal tool: every page needs a session except /login and /signup.
 * There is no `matcher`, so this runs for EVERY request: page visits, Server Action calls (a POST
 * to the page that renders the action) and the framework's own files.
 */
const PUBLIC_PAGES = ["/login", "/signup"];

/** Next's build output and files from public/ — never pages, so never redirected. */
function isFrameworkOrFile(pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  return lastSegment.includes(".");
}

export function proxy(request: ProxyRequest): ProxyResult {
  const { pathname, search } = request.nextUrl;

  // A Server Action is a POST to the page that renders it. Redirecting it means it never runs,
  // so only page visits are redirected; each action checks the session itself.
  const isPageVisit = request.method === "GET" || request.method === "HEAD";
  if (!isPageVisit || isFrameworkOrFile(pathname)) return NextResponse.next();

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
