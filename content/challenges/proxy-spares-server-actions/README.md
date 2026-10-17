`proxy.ts` is the auth gate for an internal tool: every page needs a `session` cookie except
`/login` and `/signup`. Signed-out visitors go to `/login?next=…`; signed-in visitors who open
`/login` or `/signup` go to `/`.

It has no `matcher`, so Next runs it for **every** request, not only page visits. Two kinds of
request slip into it that it was never written for:

1. **Server Action calls.** The sign-up form creates the account in the browser, which sets the
   `session` cookie, then calls the `createProfile()` Server Action. That call is a `POST` to
   `/signup`, the page that renders the form, and it now carries the cookie. The proxy answers it
   with a 307 and the profile row is never written. Nothing on the server errors.
2. **Static files.** The login page's own CSS and JavaScript (`/_next/static/…`) and public files
   like `/logo.png` are redirected to `/login` for a signed-out visitor.

`fake-next-server.ts` mirrors the shape of `NextRequest` / `NextResponse` so the function reads
like a real `proxy.ts`.

## Hints

- A page visit is `GET` or `HEAD`. Anything else reaching a page's path is a call to that page
  (here, a Server Action), and the action checks the session itself.
- In a real app you'd usually keep these out with `config.matcher`, a negative lookahead that
  names both Next's folders and your file extensions (the proxy docs show
  `/((?!api|_next/static|_next/image|.*\\.png$).*)`). Excluding `_next/static` alone still runs
  the proxy for `/logo.png`. Here the function has to do it: a file is a path whose last segment
  contains a `.`.
- Return early for the requests you never redirect, before reading the cookie.
