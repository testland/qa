# The pull-request container scan takes ten minutes and nobody has to pass it any more

## Problem Description

I run the platform team at a payments company. Our `image-scan` workflow checks
the `checkout-api` container on every pull request and again at 03:00 every
night, and it is the same job both times.

Three weeks ago I agreed to take it out of the required checks. It was that or
keep eleven engineers waiting ten minutes per push for a report with 340 rows in
it that nobody reads. So as of today we build, merge and publish images that
nothing blocks. I want it required again by the end of next week and I want the
pull-request run to finish in roughly two minutes.

Two constraints.

First, coverage. In April, Legal, our hardening review and our security lead all
signed off on things this job does beyond CVE detection. That sign-off is
attached and I am not allowed to quietly stop doing any of it. If something
changes I have to be able to tell all three of those people exactly how their
commitment is still being met. The nightly slot exists and has all the wall
clock in the world, so use it if it helps.

Second, the 25th. The job began failing at 11:20 with an unknown-flag error and
healed itself at 13:05 when someone re-ran it. Nothing in our repository changed
that day and nobody has explained it since. I do not want that happening in the
middle of a release.

Attached: the scan workflow, the workflow that pushes images to our internal
registry, the timing and finding breakdown from the last pull-request run, and
the April sign-off. For the record, the team's own proposal was "leave it
non-blocking and read the report when we feel like it", which is what we have
now, and it is not an answer.

## Output Specification

1. Edit `.github/workflows/image-scan.yml` so the pull-request path is a gate an
   engineer will actually wait for. Add or change any other workflow file your
   answer needs.
2. Write `docs/image-scan-plan.md` covering: what blocks a pull request after
   your change and roughly how many findings that is on the numbers attached;
   how each of the three April commitments is still met afterwards; and what
   caused the failure on the 25th.

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

=============== FILE: .github/workflows/publish.yml ===============
name: publish

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: build
        run: docker build -t registry.internal/checkout-api:${{ github.sha }} .
      - name: push
        run: docker push registry.internal/checkout-api:${{ github.sha }}
      - name: tag rolling
        run: |
          docker tag registry.internal/checkout-api:${{ github.sha }} \
                     registry.internal/checkout-api:main
          docker push registry.internal/checkout-api:main

# merges to main: 6-14 per working day. Nothing else writes to this registry.

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

Three commitments were made outside the platform team and none has been
revisited since.

**Legal — D. Okonjo.** The licences bundled into any image we publish to the
internal registry must be enumerated at least once a week, and the enumeration
retained. GPL-family findings are reviewed monthly at the licensing sync.

**Hardening review — M. Prieto.** Dockerfile and runtime configuration checks
must cover every image that reaches the internal registry, and must do so before
that image is published there. No image is exempt. Cadence was not otherwise
specified and no per-pull-request requirement was discussed.

**Security — R. Adeyemi.** Checks for credentials and other secrets baked into
the image run on every change, without exception. This one was written after the
2025 incident and R. Adeyemi has said in writing that he will not renegotiate it.

None of the three names a tool and none of them mentions pull requests.
