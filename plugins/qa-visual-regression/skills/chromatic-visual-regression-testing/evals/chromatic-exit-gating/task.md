# Our Chromatic job blocks the wrong things

## Problem Description

Fix the Chromatic CI job in `.github/workflows/chromatic.yml` so it blocks what it should and nothing else (`docs/history.md`).

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: .github/workflows/chromatic.yml ===============
name: chromatic
on: push
jobs:
  visual:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx chromatic --project-token=${{ secrets.CHROMATIC_PROJECT_TOKEN }} --only-changed || true

=============== FILE: docs/history.md ===============
- We added `|| true` because every intended UI change turned the PR red until someone accepted
  it in Chromatic.
- Last week a story that throws on render and a failed build-storybook both showed green and shipped.
- The Chromatic log says it found only one commit in the history, and every PR snapshots all stories.
- After squash-merging a PR, the build on main shows the same changes again, though they were
  accepted on the PR.
- A font swap in `public/fonts/` changed every page but TurboSnap snapshotted nothing.
