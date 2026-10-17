`ProfileCard` renders a public profile. Every field in `profile.ts` comes straight from a form,
so every field is attacker-controlled. With friendly data the card looks fine; the second card in
the preview uses hostile data, and with the starter code its payloads run (they only repaint the
page).

Three places let user text become code:

1. **The bio** is plain text, but it's rendered with `dangerouslySetInnerHTML`, so any tag in it
   becomes a real element, including an `<img>` whose `onerror` runs script.
2. **The avatar** is built as an HTML string. A `"` in the name closes the `alt` attribute early
   and starts a new attribute of the attacker's choosing.
3. **The website** is filtered with a deny-list. `startsWith("javascript:")` misses
   `JavaScript:` and `  javascript:`, and says nothing about `data:` or any other scheme. React 19
   replaces `javascript:` URLs with one that throws, which stops that click, but it renders every
   other scheme as given, and the card shouldn't make a link out of something that isn't a website.

## Hints

- Text that should appear as typed needs no special handling in React: render it as `{value}`.
- JSX attributes are escaped for you. Build the `<img>` with JSX instead of a string.
- `new URL(value)` throws on anything that isn't an absolute URL, and its `protocol` is already
  lowercased with leading spaces, tabs and newlines removed. Allow `"https:"` and `"http:"`;
  reject everything else.
