# Content review — known accuracy issues

Found on 2026-10-17 while backfilling every unit's `sources`. Each entry is a claim that the
official docs contradict, a claim that depends on a version without naming it, or a place where a
unit contradicts itself. This is the work list for the content phase.

Work through it with `/improve-lesson`, like feedback issues. Check each entry against the
unit's sources before changing anything (the finder was an AI reading the docs, and could be
wrong too), and delete the entry when its fix lands; the changelog line is the record. Paths are
relative to the unit folder unless they start with `content/`.

## Open findings

None. All 47 findings from the 2026-10-17 sources backfill were fixed (or, for one, rejected with
the reason in its PR) in the content-phase PRs; the changelog lines are the record. Add new
findings here under a `## <track>` / `### <unit>` heading.
