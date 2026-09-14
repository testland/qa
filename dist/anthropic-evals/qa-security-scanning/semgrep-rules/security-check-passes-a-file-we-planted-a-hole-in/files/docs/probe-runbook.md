# Gate probe runbook

Written 2026-08-18 by @h.okafor. How we show that the blocking check blocks.

1. Branch off `main`.
2. Touch `security/gate-probe/probe.js` so the branch has a commit on it.
3. Open a pull request against `main`.
4. Watch the `sast` check on the pull request.

The probe file is kept in the repository at `security/gate-probe/probe.js` so
that nobody has to retype it.

Run history:

- 2026-08-19, branch `gate-probe`, PR #812. Check green. PR merged.
- 2026-09-09, branch `gate-probe-2`, PR #901. Check green.
