# Notes on the merge step, from the platform team

- Five tools produce output. `sastpro` and `checkov` have no commenting step of
  their own, which is why only three comments get posted. sastpro's 171
  findings reach the merged file but have never appeared in a PR comment.
- checkov returned zero findings on this commit. It ran; the terraform in
  `infra/` is scanned on every push.
- The merge writes `caught_by` correctly but the renderer drops the column to
  save width.
- When two tools disagree on severity for one merged record, the merge keeps
  whichever tool was written last, which is alphabetical by scanner id. We know
  this is arbitrary. `web/render.js:30` is the example everyone quotes: semgrep
  calls it high, sastpro calls it medium, the merged record says medium.
- `gh pr comment` is called three times per push with no de-duplication, which
  is where the 119 comments came from.
