# One reporting test went red and nobody touched that code

## Problem Description

`invoice-export.spec.ts` failed on `main` last night. It asserts on a formatted
currency total and it now gets the digits and the symbol arranged differently
than expected. Nobody has touched the reporting code in about six weeks, and
the only commit in the run is a README link fix.

We are in a release freeze and we have to say something today. The awkward part
is that this is all we have: we moved CI providers a fortnight ago and the new
workspace keeps job logs for 24 hours, so the previous green run's log is gone,
and the per-test history dashboard has not been rebuilt on the new provider.
There is no flake list or quarantine convention in this repo.

Two people already have theories - one says a formatting dependency drifted,
one says the reporting code was always wrong and only now got exercised. We
want a written determination that a reviewer can check, rather than whichever
theory gets typed loudest in the channel.

## Output Specification

Produce `triage-reporting-2204.md` containing:

1. What kind of failure this is and who owns the next action, or - if the
   attached material does not settle it - a clear statement that it does not.
2. What the attached material does establish, quoting the specific lines and
   values you relied on.
3. What it does not establish, and for each gap the exact artefact you would
   collect to close it and what that artefact would let you conclude.
4. The next action, stated so someone else can carry it out today.

Do not fill a gap with the most likely story.

Out of scope: editing tests or application code, pinning or changing any
dependency, and drafting a bug-report form.

## Input Files

Extract the following files before beginning.

=============== FILE: logs/job-2204.log ===============
[2026-08-15T23:41:02Z] pipeline: main / test (attempt 1 of 1)
[2026-08-15T23:41:02Z] agent: linux-amd64-medium  image: ci-node20:stable  workspace: /builds/acme/reporting
[2026-08-15T23:41:03Z] $ git rev-parse --short HEAD
[2026-08-15T23:41:03Z] e77a10c
[2026-08-15T23:41:03Z] $ git log -1 --pretty=%s
[2026-08-15T23:41:03Z] docs: fix broken links in the README
[2026-08-15T23:41:04Z] $ npm install
[2026-08-15T23:41:06Z] npm warn old lockfile
[2026-08-15T23:41:06Z] npm warn ideal tree: package-lock.json not found; a lockfile will be created but is not committed in this repository
[2026-08-15T23:41:45Z] added 1204 packages, and audited 1205 packages in 41s
[2026-08-15T23:41:45Z] 118 packages are looking for funding
[2026-08-15T23:41:46Z] found 0 vulnerabilities
[2026-08-15T23:41:47Z] $ npx vitest run
[2026-08-15T23:41:52Z]  RUN  v2.1.4 /builds/acme/reporting
[2026-08-15T23:42:11Z]  ✓ tests/reporting/summary.spec.ts (12 tests) 1841ms
[2026-08-15T23:42:19Z]  ✓ tests/reporting/csv-export.spec.ts (7 tests) 902ms
[2026-08-15T23:42:24Z]  ❯ tests/reporting/invoice-export.spec.ts (5 tests | 1 failed) 1120ms
[2026-08-15T23:42:24Z]    × exports the grand total in the account currency
[2026-08-15T23:42:24Z]      → expected '1.234,50 €' to be '€1,234.50' // Object.is equality
[2026-08-15T23:42:24Z]
[2026-08-15T23:42:24Z]  FAIL  tests/reporting/invoice-export.spec.ts > exports the grand total in the account currency
[2026-08-15T23:42:24Z] AssertionError: expected '1.234,50 €' to be '€1,234.50'
[2026-08-15T23:42:24Z]
[2026-08-15T23:42:24Z] - Expected
[2026-08-15T23:42:24Z] + Received
[2026-08-15T23:42:24Z]
[2026-08-15T23:42:24Z] - €1,234.50
[2026-08-15T23:42:24Z] + 1.234,50 €
[2026-08-15T23:42:24Z]
[2026-08-15T23:42:24Z]  ❯ tests/reporting/invoice-export.spec.ts:38:42
[2026-08-15T23:42:24Z]      36|   const row = exportInvoice(invoice, { account });
[2026-08-15T23:42:24Z]      37|
[2026-08-15T23:42:24Z]      38|   expect(row.grandTotal).toBe('€1,234.50');
[2026-08-15T23:42:24Z]         |                                          ^
[2026-08-15T23:42:24Z]      39| });
[2026-08-15T23:42:24Z]
[2026-08-15T23:42:24Z]  Test Files  1 failed | 14 passed (15)
[2026-08-15T23:42:24Z]       Tests  1 failed | 233 passed (234)
[2026-08-15T23:42:24Z]    Duration  37.12s
[2026-08-15T23:42:25Z] exit status 1
[2026-08-15T23:42:25Z] pipeline: FAILED
