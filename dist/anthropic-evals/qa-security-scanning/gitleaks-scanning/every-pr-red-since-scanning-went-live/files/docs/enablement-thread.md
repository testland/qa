# #platform-eng, 2026-09-12

**kurt.hensel** — 214 findings, nine PRs blocked, five days. A required check
nobody can pass is worse than no check. Put `continue-on-error: true` on the
step, leave the report as an artifact, take it off `continue-on-error` when the
backlog is under 20. I'll own the burn-down.

**priya.raman** — or I paste all 214 fingerprints into the ignore file this
afternoon and we delete lines as we fix them. Same effect, keeps the check red
when something new shows up.

**kurt.hensel** — either works for me, pick one before standup.

**e.moreau (EM)** — the two hotfix PRs need to merge tomorrow morning. #4471 is
the checkout timeout, #4468 is the search index rebuild. I don't mind which
route, I mind that it's done.
