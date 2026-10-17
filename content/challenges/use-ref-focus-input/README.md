`SearchForm` has a search box and a **Clear** button. Clear empties the box, but focus
stays on the button: the user has to click back into the input before typing the next
search.

React's one declarative focus prop, `autoFocus`, focuses an element when it **mounts**.
This input is already mounted when Clear is clicked, so moving focus in response to an
action means calling `.focus()` on the real DOM node — and reaching a component's own DOM
node is what a ref is for.

## Hints

- Each `SearchForm` needs its own handle on its own `<input>`. Hand a ref to the input's
  `ref` attribute and React fills it with the DOM node when it commits.
- Focus is a response to the click, so it belongs in the Clear handler, not in an effect
  that watches the query. By the time anyone can click, React has committed the input, so
  the ref already holds the node.
- A document-wide lookup such as `document.querySelector` finds the first matching input
  on the page, which is the wrong one as soon as two forms render.
