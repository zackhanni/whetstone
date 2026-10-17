`commitsToReplay(history, upstream, branch)` should return what `git rebase <upstream> <branch>`
replays — the `pick` lines `git rebase -i` would show, in order. The Git 2.50 `git-rebase` manual
defines the set as the commits `git log <upstream>..<branch>` shows, minus merge commits, minus
any commit that "introduce[s] the same textual changes" as a commit upstream gained since the two
split (`<branch>..<upstream>`).

`history.ts` models a commit graph: each commit has `parents` (two for a merge) and a `patch`
string standing in for git's patch-id — two commits with the same `patch` make the same change.

The starter gets four things wrong, each a common way of thinking about rebase:

1. **"Upstream has what's on its first-parent line."** Reachability goes through every parent.
   A branch merged into `main` with a merge commit is reachable from `main` through that merge's
   second parent, so rebasing a branch stacked on it replays only the stacked commits.
2. **"The list is like `git log`."** `git log` shows newest first; a rebase replays the oldest
   commit first, each one on top of the previous.
3. **"Merges come along."** A plain rebase drops merge commits and replays a linear history.
4. **"Every commit gets replayed."** A commit whose change is already upstream — cherry-picked, or
   squash-merged as a one-commit branch — is skipped (`warning: skipped previously applied commit`).

Three tests already pass on the starter. One guards your fix for 4: a change only counts as
already upstream if upstream *gained* it — a commit that re-applies something from the history
both sides share (a reverted change, say) is still replayed. The last two are the point of the
exercise: a **squash** merge creates a
brand-new commit, so a branch stacked on a multi-commit base still contains the base's original
commits — and `git rebase main` tries to replay them, usually into conflicts. Naming the old base
as the upstream (`git rebase --onto main feature-a`) leaves them out.

## Hints

- Compute "everything reachable from upstream" with a walk that pushes **all** parents.
- A post-order walk from the branch tip (visit parents first, then record the commit) gives the
  oldest-first order directly; reversing the walk order also works for these histories.
- Only patches from commits upstream has **and the branch doesn't** count as "already upstream".
