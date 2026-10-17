`SearchList` renders a filter input above a list of fruit. The input sets its
`value` from state — but there's **no `onChange`**, so typing never updates the
state. The field looks frozen, and the list never filters.

This is the classic half-wired controlled input: `value` in, but no way for the
input to push changes back to state.

## Hints

A controlled input needs both halves of the loop: `value` carries state into the field,
and a change handler carries every keystroke back into state. The new text is on the
event's target. With both in place, React state stays the single source of truth.
