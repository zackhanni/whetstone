`SearchForm` renders a search box that **should be focused the instant the form
mounts**, so the user can start typing right away. Right now nothing focuses it —
`document.activeElement` is the page body, not the input.

You can't focus a DOM node declaratively; you need to reach the real element and call
`.focus()` on it. That's a job for `useRef`.

## Hints

Declare `const inputRef = useRef<HTMLInputElement>(null)`, put
`ref={inputRef}` on the `<input>`, then call `inputRef.current?.focus()` inside a
`useEffect(() => { … }, [])`. The effect runs after React commits the node, so
`inputRef.current` is the real element by then (in the render body it's still `null`).
