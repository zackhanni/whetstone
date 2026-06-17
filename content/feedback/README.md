# Feedback log

Learner feedback lands here as small files (a 👎, a rating, or a typed note tied to a
lesson/block). `/improve-lesson` reads this folder, edits the affected content directly
(git is the safety net), logs the change in `docs/lesson-changelog.md`, and clears the
handled feedback.

Suggested format — one file per item, `<unit-slug>--<block-id>--<timestamp>.md`:

```md
---
unit: use-effect
block: predict-stale-interval
kind: content | difficulty | interface
rating: 1-5
---

Short note on what felt off.
```
