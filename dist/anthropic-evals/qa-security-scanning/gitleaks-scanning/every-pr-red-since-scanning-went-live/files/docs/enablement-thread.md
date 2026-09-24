# #platform-eng, 2026-09-12

**kurt.hensel** (staff, owns the pipeline) — 214 findings, nine PRs blocked,
five days. A required check nobody can pass is worse than no check. Put
`continue-on-error: true` on the step, keep the report as an artifact, take it
off when the backlog is under 20. I'll own the burn-down.

**priya.raman** — or I paste all 214 fingerprints into the ignore file this
afternoon and we delete lines as we fix them. Keeps the check red the moment
something new shows up.

**tomas.eriksen** (security) — neither. Point the job at the working tree
instead of the history and cut the clone to depth 1 while we're at it. I ran it
that way on my branch this morning: 214 becomes 3, the job goes from 4m10s to
26s, the check stays required and stays blocking, and the three it finds are
real files we can fix this week. Most of that 214 is stuff we deleted years ago.

**e.moreau (EM)** — #4471 (checkout timeout) and #4468 (search index rebuild)
have to merge tomorrow morning. I don't mind which route.
