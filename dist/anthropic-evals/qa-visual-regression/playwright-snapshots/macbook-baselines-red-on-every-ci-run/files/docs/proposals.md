# Thread: "visual job red on every PR" (#eng-web, 2026-09-08 to 2026-09-10)

**P1 - @dyoung.** Put `--update-snapshots` on the test command in the workflow.
Then CI always has fresh baselines generated on the machine that is doing the
comparing and the whole operating-system argument goes away. One line:
`- run: npx playwright test --update-snapshots`. I have done this at two
previous jobs and it just works. And before anyone says it stops the job being
able to fail - it does not, the job still goes red if the page 500s, if a
locator is missing, or if any of the non-visual assertions break.

**P2 - @lmorris.** Set the snapshot path template so the operating-system
segment is not part of the filename - something like
`snapshotPathTemplate: 'tests/__baselines__/{arg}{ext}'`. One baseline per
check, shared by everybody, laptops and CI both. Cleaner directory too: right
now we would end up with two copies of every image in the repo and I do not want
that in review diffs.

**P3 - @sasha.** The differences are font smoothing. They are a couple of pixels
on the edges of letters. Set `maxDiffPixelRatio: 0.35` project wide and they
stop mattering. That is a ratio of the whole image and text is maybe 4% of the
page, so font smoothing cannot get anywhere near it - it is not as loose as the
number makes it sound.

**P4 - @sasha.** Separately from all of the above: the `#drift-chat` bubble
bottom-right and the "last synced N minutes ago" line in the account header move
between runs **on the same machine**. I reproduced it locally: same commit, same
laptop, ran the check six times, two of the six differed and both diffs were
inside those two elements. That is going to keep biting us whatever we decide
about the operating-system question.

**P5 - @dyoung.** If people hate P1, here is the same idea in a shape they might
tolerate: a second workflow, manual trigger only, that runs the same command and
pushes the regenerated PNGs to the branch as a commit, so the new images land in
the pull request diff and somebody has to look at them before it merges.
Developers would stop committing baselines from their laptops entirely.
