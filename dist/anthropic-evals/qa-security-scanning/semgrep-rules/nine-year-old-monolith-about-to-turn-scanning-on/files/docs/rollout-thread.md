# #eng-platform — SAST enablement, 2026-09-05

**marta.reinholt** — 1,847 is not a number a team acts on, it is a number a team
routes to a folder. I have seen this twice. My proposal: gate the PR check on
the highest severity band only, which is 212 findings, and leave the rest as a
nightly informational report. We can widen later once the 212 are gone. If we
go live with all 1,847 blocking, someone will have the check switched off by
Friday and we will be back where we started with a board commitment behind us.

**dev.chaudhary** — Agreed on the noise, different cut. 1,504 of the 1,847 are
in src/legacy. That tree is frozen; we do not accept refactors to it outside a
scheduled window. Scanning it on every PR means every PR that touches a shared
util lights up with findings nobody is allowed to fix. Take src/legacy out of
the scan config, review it separately once a quarter.

**marta.reinholt** — I would take either over what we have now, which is nothing.

**t.okonkwo** — Both of these land before Monday or we are explaining a slipped
board commitment. Whoever picks this up: write it down so I can forward it.
