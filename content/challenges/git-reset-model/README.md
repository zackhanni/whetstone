`reset.ts` implements `git reset --soft | --mixed | --hard <target>` over a tiny repo model
(`repo.ts`): a store of commits (each a full snapshot of its files), branches as pointers, an
index, a working tree, a reflog and `ORIG_HEAD`. `status()` prints what `git status --short`
would, and the tests compare it with what real git printed for the same repo:

```text
c1 "First"   a.txt = "a1"
c2 "Second"  a.txt = "a2", b.txt = "b"    ← main, HEAD
working tree also has scratch.txt (untracked)
```

Each of the four bugs is a common belief about reset:

1. "**--soft** unstages the changes." It doesn't touch the index at all — after
   `reset --soft HEAD~1` the undone commit's changes are still staged, ready to recommit.
2. "**reset** changes my files." `--mixed` (the default) resets the index only; the working
   tree keeps every edit.
3. "**--hard** wipes the folder." It rewrites the files git tracks. An untracked file survives
   (deleting those is `git clean`'s job). A file that was only *staged*, never committed, is
   tracked — so `--hard` does remove that one.
4. "**reset** deletes the commits." It moves a branch. The old tip stays in the object store,
   in `ORIG_HEAD` and in the reflog, which is how `git reset --hard ORIG_HEAD` undoes a reset.

## Hints

- Think of the three modes as how far the reset reaches: branch → index → working tree.
- For `--hard`, a path is untracked when it's in the working tree but in neither the old index
  nor the target commit.
- Nothing in reset needs to delete anything from `commits`.
