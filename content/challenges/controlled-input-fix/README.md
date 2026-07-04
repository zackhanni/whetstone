# Fix the search box that won't type

`SearchList` renders a filter input above a list of fruit. The input sets its
`value` from state — but there's **no `onChange`**, so typing never updates the
state. The field looks frozen, and the list never filters.

This is the classic half-wired controlled input: `value` in, but no way for the
input to push changes back to state.

## Your task

Edit **`SearchList.tsx`** so the input is properly controlled.

- [ ] Typing in the search box updates the input's displayed value
- [ ] The list filters to items matching the typed text (case-insensitive)
- [ ] Clearing the box shows all items again

**Hint:** a controlled input pairs `value={query}` with
`onChange={(e) => setQuery(e.target.value)}`. Both props together keep React state
as the single source of truth.

## Running

In Whetstone this runs in-browser and grades automatically. The reference solution
lives in `solution.tsx`.
