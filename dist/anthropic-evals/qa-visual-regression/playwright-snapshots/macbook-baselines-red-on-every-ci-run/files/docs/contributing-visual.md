# Contributing - visual checks

Every page under `tests/` has a committed baseline image. If your change alters
what a page looks like, record the new baselines before you push:

```bash
npx playwright test --update-snapshots
git add tests
git commit -m "chore(visual): rebaseline"
```

Reviewers: open the PNGs in the PR diff and confirm the change is the one
described in the PR body.

Last edited 2026-02-11 by @priya.
