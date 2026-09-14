# Thread: "visual job is unusable" - #platform-eng

**@sasha** (2026-09-08 14:02)
The name of every baseline has an operating system in it, which means we are
maintaining two copies of the same picture forever and they never agree. Branch
`fix/one-baseline` drops that part of the name so each check has exactly one
file per browser project. Re-recorded on my machine, job went green, pushed
twice more, still green. Two people do not need two sets of pictures of the same
page.

**@marek** (2026-09-08 14:19)
Or simpler: have the pull-request job record the baselines while it runs. Then
it cannot be red, ever, and we stop having this conversation every week.

**@priya** (2026-09-08 14:35)
I would rather nobody records baselines on a laptop at all. Give us a job that
only a human can start, on the same runner image the checks run on, that records
and commits back. Developers never commit a PNG again.

**@dyoung** (2026-09-08 14:51)
Has anyone actually looked at what is different? It is font antialiasing. It is
one or two shades on the edge of every glyph. Set the allowance to 250000 pixels
and all of this goes away without changing any plumbing.

**@dyoung** (2026-09-08 14:58)
Also, unrelated, but when the job is red I cannot get at the images. The run
page has no artifact on it. I have been reading pixel counts out of the log.
