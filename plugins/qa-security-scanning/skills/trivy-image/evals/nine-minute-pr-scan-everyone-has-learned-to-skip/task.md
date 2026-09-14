# The pull-request container scan takes ten minutes and nobody is required to pass it any more

## Problem Description

I run the platform team at a payments company. Our `image-scan` workflow checks
the `checkout-api` container on every pull request and again once a night.

Three weeks ago I agreed to take that job out of the required checks. It was
either that or keep eleven engineers waiting ten minutes per push for a report
with 340 rows in it that nobody reads. So as of today we build and publish
images that nothing blocks. I want it required again by the end of next week and
I want the pull-request run to finish in roughly two minutes.

Two constraints.

First, coverage. In April, Legal and our hardening review both signed off on
things this job does beyond CVE detection. That sign-off is attached. I am not
allowed to quietly stop doing any of it, and if you move something I have to be
able to tell those two people exactly where it went and how often it runs now.

Second, the 25th. The job began failing at 11:20 with an unknown-flag error and
healed itself at 13:05 when someone re-ran it. Nothing in our repository changed
that day and nobody has explained it since. I do not want that happening in the
middle of a release.

Attached are the workflow, the timing and finding breakdown from the last
pull-request run, and the April sign-off. For the record, the team's own
proposal was "leave it non-blocking and read the report when we feel like it",
which is exactly what we have now, and it is not an answer.

## Output Specification

1. Edit `.github/workflows/image-scan.yml` so the pull-request path is a gate an
   engineer will actually wait for.
2. Whatever coverage leaves the pull-request path has to keep running somewhere
   — in that same file or in a new workflow file, your call.
3. Write `docs/image-scan-plan.md` covering: what blocks a pull request after
   your change and roughly how many findings that is on the numbers attached;
   where each class of finding that left the pull-request path is checked now
   and on what cadence; and what caused the failure on the 25th.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/image-scan.yml ===============
name: image-scan

on:
  pull_request:
  schedule:
    - cron: "0 3 * * *"

jobs:
  scan:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v5

      - name: build
        run: docker build -t checkout-api:${{ github.sha }} .

      - name: scan
        run: |
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:latest image \
              --scanners vuln,secret,misconfig,license \
              --format table \
              --exit-code 1 \
              checkout-api:${{ github.sha }}

=============== FILE: reports/pr-4471-run.md ===============
# image-scan, PR #4471 (checkout-api), 2026-09-09, run 18844021

Conclusion: failure. Wall clock 9m 41s.

## Where the time went

| Phase                      | Time   |
|----------------------------|--------|
| docker build               | 1m 12s |
| vulnerability DB download  | 3m 50s |
| vulnerability scan         |    41s |
| secret scan                |    12s |
| misconfiguration scan      | 1m 36s |
| license scan               | 2m 10s |

## What came back

| Class            | CRITICAL | HIGH | MEDIUM | LOW | total |
|------------------|----------|------|--------|-----|-------|
| vulnerability    |        6 |   31 |    188 |  97 |   322 |
| secret           |        0 |    0 |      0 |   0 |     0 |
| misconfiguration |        1 |    3 |      4 |   0 |     8 |
| license          |        0 |    2 |      8 |   0 |    10 |

Of the 322 vulnerability findings, 284 carry no fixed version in the report —
the distribution has not published a patched package. Of the 6 CRITICAL, 2 have
a fixed version. Of the 31 HIGH, 9 do.

The single CRITICAL misconfiguration is the same one flagged on every run since
June: the image runs as root. Ticket PLAT-2210, open.

=============== FILE: docs/scan-policy.md ===============
# Image scanning obligations (approved 2026-04-02)

Two commitments were made outside the platform team and neither has been
revisited since.

**Legal — D. Okonjo.** The licences bundled into any image we publish to the
internal registry must be enumerated at least once a week, and the enumeration
retained. GPL-family findings are reviewed monthly at the licensing sync.

**Hardening review — M. Prieto.** Dockerfile and runtime configuration checks
must cover every image that reaches the registry, before it is published.
Cadence was not specified and no per-change requirement was discussed.

Neither commitment names a tool and neither mentions pull requests.
