`SearchList` renders a filter input above a list of fruit. The input sets its
`value` from state — but there's **no `onChange`**, so typing never updates the
state. The field looks frozen, and the list never filters.

This is the classic half-wired controlled input: `value` in, but no way for the
input to push changes back to state.

## Hints

A controlled input pairs `value={query}` with
`onChange={(e) => setQuery(e.target.value)}`. Both props together keep React state
as the single source of truth.
