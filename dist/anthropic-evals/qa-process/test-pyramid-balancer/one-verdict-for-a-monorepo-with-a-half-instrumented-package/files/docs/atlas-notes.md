# atlas - what the teams say, collected 2026-09-14

**ledger** (team Mint, 6 engineers). Two production incidents in the last
quarter, both contract mismatches between ledger and the settlement service:
a field renamed on one side of the boundary and a minor-unit mismatch on
currency amounts. Unit tests passed through both. The end-to-end suite caught
one in staging; the other reached production. Mint's tech lead says they
"don't really write integration tests, we never set the fixtures up."

**console** (team Iris, 5 engineers). No incidents this quarter. Iris rewrote
their middle layer in March and says it is the part of the suite they trust
most. Pull-request wait time is the top complaint in their retro; their CI
config shows the webpack build at 7m20s of an 11m40s job.

**ingest** (team Kiln, 3 engineers). Carved out of ledger on 2026-08-29. Still
moving files in; two more extraction pull requests are open. Kiln asked not to
be measured on anything until the extraction lands, which they expect in
October.
