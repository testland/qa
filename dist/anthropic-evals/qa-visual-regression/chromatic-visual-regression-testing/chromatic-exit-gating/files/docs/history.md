- We added `|| true` because every intended UI change turned the PR red until someone accepted
  it in Chromatic.
- Last week a story that throws on render and a failed build-storybook both showed green and shipped.
- The Chromatic log says it found only one commit in the history, and every PR snapshots all stories.
- After squash-merging a PR, the build on main shows the same changes again, though they were
  accepted on the PR.
- A font swap in `public/fonts/` changed every page but TurboSnap snapshotted nothing.
