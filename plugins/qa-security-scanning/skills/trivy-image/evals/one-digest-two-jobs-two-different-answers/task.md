# One digest, two verdicts in a day, and an architecture note that says scan it once

## Problem Description

I am the release manager for `checkout-api` and I need a decision before 20:00.

The same artifact — `registry.internal/checkout-api@sha256:c41e7b9a0f28`, one
digest, nothing rebuilt — was scanned twice today. At 09:14 the pull-request job
reported nothing blocking and the change merged. At 16:02 the release job on
that identical digest reported one CRITICAL and failed. Nobody touched the image
between those two runs and nobody touched either workflow.

Slack this afternoon, in order: "the scanner is flaky, give it a retry step",
then "it passed this morning on the same digest, just re-run it", then "if it
comes back put the identifier in the suppression file and we will do it properly
on Monday". Someone acted on the third one and opened PR #4508, which is
attached, approved by one reviewer and waiting on me.

Separately — and this is the part I actually want your opinion on — our
principal engineer has had an architecture note in review for three weeks that
would make today impossible by construction. It says a container image is
immutable, so scanning the same bytes twice and getting two answers means the
scan is not a valid gate, and that we should scan once at merge, record the
verdict against the digest, and have the release job look that verdict up
instead of scanning again. The release board has read it and likes it. It takes
four minutes out of every release and it ends this class of argument. The note
is attached, along with the release-scan history I pulled for it this afternoon.

I have also attached both job logs, an ad-hoc run one of our engineers did at
16:41 while arguing with the second Slack suggestion, both workflow files and
the current suppression file.

What I need from you is whether we ship at 20:00, and whether I adopt the note.

## Output Specification

1. Write `docs/release-4.12.2-go-no-go.md`: the decision for the 20:00 window,
   what actually differs between the two runs and what does not, your ruling on
   the architecture note, and what changes in the pipeline.
2. Edit `.github/workflows/pr-scan.yml` and `.github/workflows/release-scan.yml`
   as your answer requires.
3. Leave `.trivyignore` as it should stand once you have ruled on PR #4508.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/pr-scan.yml ===============
name: pr-scan

on: pull_request

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: build, push, record digest
        run: |
          TAG=registry.internal/checkout-api:pr-${{ github.event.number }}
          docker build -t "$TAG" .
          docker push "$TAG"
          echo "IMAGE=$(docker inspect --format '{{index .RepoDigests 0}}' "$TAG")" >> $GITHUB_ENV
      - name: diagnostics
        run: docker run --rm aquasec/trivy:latest --version
      - name: scan
        run: |
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v ${{ runner.temp }}/trivy-cache:/root/.cache/trivy \
            aquasec/trivy:latest image \
              --severity HIGH,CRITICAL \
              --ignore-unfixed \
              --exit-code 1 \
              ${{ env.IMAGE }}

=============== FILE: .github/workflows/release-scan.yml ===============
name: release-scan

on:
  workflow_dispatch:
    inputs:
      digest:
        required: true

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: diagnostics
        run: docker run --rm aquasec/trivy:latest --version
      - name: scan
        run: |
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy:latest image \
              --severity HIGH,CRITICAL \
              --ignore-unfixed \
              --exit-code 1 \
              registry.internal/checkout-api@${{ inputs.digest }}

=============== FILE: proposed/ADR-0031-scan-the-artifact-once.md ===============
# ADR-0031: scan the artifact once, carry the verdict

Status: proposed (in review 3 weeks)   Author: @tvaldes (principal)
Read by: release board 2026-09-04, no objections recorded

## Context

A container image is content-addressed. The bytes behind
`sha256:c41e7b9a0f28` today are the bytes that were there at merge and the
bytes that will be there in a year. We currently scan those bytes at merge and
again at release, and today the two runs disagreed. A gate whose verdict on
fixed input is not stable is not a gate; it is a coin flip with a CI bill.

## Decision

1. The pull-request job scans the pushed digest. That run is authoritative.
2. Its verdict is written to the artifact store keyed by digest.
3. The release job looks up the verdict for the digest it was asked to release
   and fails if it is not `pass`. It does not scan.

## Consequences

- One artifact, one answer, for the life of the artifact.
- Roughly four minutes off every release.
- Re-running a release scan to get a different answer stops being possible,
  which is most of what we argue about.

=============== FILE: reports/release-scan-history-q3.md ===============
# release-scan outcomes, Q3 to date (pulled 2026-09-13 17:20)

41 releases. 35 of the release scans matched the verdict the pull-request job
had recorded for the same digest. 6 did not — in every one of those the release
scan was the stricter of the two.

| Release | Digest        | Merged     | Released   | Release scan found                  |
|---------|---------------|------------|------------|-------------------------------------|
| 4.10.4  | sha256:9b2f01 | 2026-07-02 | 2026-07-11 | 1 CRITICAL (openssl), fix available |
| 4.11.0  | sha256:44ce7a | 2026-07-19 | 2026-07-22 | 2 HIGH (glibc, curl), fix available |
| 4.11.3  | sha256:0d81be | 2026-08-05 | 2026-08-14 | 1 HIGH (libxml2), fix available     |
| 4.11.6  | sha256:e70a92 | 2026-08-20 | 2026-08-24 | 1 HIGH (libtasn1), fix available    |
| 4.12.0  | sha256:aa3c15 | 2026-09-01 | 2026-09-04 | 1 CRITICAL (glibc), fix available   |
| 4.12.2  | sha256:c41e7b | 2026-09-13 | pending    | 1 CRITICAL (libcurl4), fix available|

Median gap between merge scan and release scan across all 41: 4 days.

=============== FILE: logs/pr-scan-2026-09-13-0914.txt ===============
Run docker run --rm aquasec/trivy:latest --version
Version: 0.58.2
Vulnerability DB:
  Version: 2
  UpdatedAt: 2026-09-11 06:12:41 +0000 UTC
  NextUpdate: 2026-09-11 12:12:41 +0000 UTC
  DownloadedAt: 2026-09-11 07:40:03 +0000 UTC

Run docker run --rm ... image ...
2026-09-13T09:14:02Z INFO  Vulnerability scanning is enabled
2026-09-13T09:14:02Z INFO  Secret scanning is enabled
2026-09-13T09:14:03Z INFO  DB cache hit, skipping download
2026-09-13T09:14:39Z INFO  Detected OS family="debian" version="12.7"

registry.internal/checkout-api@sha256:c41e7b9a0f28 (debian 12.7)
Total: 0 (HIGH: 0, CRITICAL: 0)

app/package-lock.json (npm)
Total: 0 (HIGH: 0, CRITICAL: 0)

Process exited with code 0

=============== FILE: logs/release-scan-2026-09-13-1602.txt ===============
Run docker run --rm aquasec/trivy:latest --version
Version: 0.59.0
Vulnerability DB:
  Version: 2
  UpdatedAt: 2026-09-13 06:09:12 +0000 UTC
  NextUpdate: 2026-09-13 12:09:12 +0000 UTC
  DownloadedAt: 2026-09-13 16:02:08 +0000 UTC

Run docker run --rm ... image ...
2026-09-13T16:02:04Z INFO  Vulnerability scanning is enabled
2026-09-13T16:02:04Z INFO  Secret scanning is enabled
2026-09-13T16:02:04Z INFO  Need to update DB
2026-09-13T16:02:08Z INFO  Vulnerability DB downloaded
2026-09-13T16:02:51Z INFO  Detected OS family="debian" version="12.7"

registry.internal/checkout-api@sha256:c41e7b9a0f28 (debian 12.7)
Total: 1 (HIGH: 0, CRITICAL: 1)

+-----------+----------------+----------+----------------------+----------------------+
|  Library  | Vulnerability  | Severity |      Installed       |        Fixed         |
+-----------+----------------+----------+----------------------+----------------------+
| libcurl4  | CVE-2026-21491 | CRITICAL | 7.88.1-10+deb12u7    | 7.88.1-10+deb12u9    |
+-----------+----------------+----------+----------------------+----------------------+

app/package-lock.json (npm)
Total: 0 (HIGH: 0, CRITICAL: 0)

Process exited with code 1

=============== FILE: logs/adhoc-2026-09-13-1641.txt ===============
# @dpetrova, laptop, 16:41
$ docker run --rm -v $HOME/.cache/trivy:/root/.cache/trivy \
    aquasec/trivy:0.58.2 image --severity HIGH,CRITICAL --ignore-unfixed \
    registry.internal/checkout-api@sha256:c41e7b9a0f28

Version: 0.58.2
Vulnerability DB:
  UpdatedAt: 2026-09-13 06:09:12 +0000 UTC
  DownloadedAt: 2026-09-13 16:38:55 +0000 UTC

registry.internal/checkout-api@sha256:c41e7b9a0f28 (debian 12.7)
Total: 1 (HIGH: 0, CRITICAL: 1)
  libcurl4  CVE-2026-21491  CRITICAL  7.88.1-10+deb12u7  ->  7.88.1-10+deb12u9

=============== FILE: .trivyignore ===============
CVE-2023-45853

=============== FILE: proposed/PR-4508.diff ===============
PR #4508  "unblock 4.12.2 release scan"
Author: @mreinholt   Reviewers: @sjadhav (approved)   Base: main

 .trivyignore | 1 +
 1 file changed, 1 insertion(+)

diff --git a/.trivyignore b/.trivyignore
--- a/.trivyignore
+++ b/.trivyignore
@@ -1 +1,2 @@
 CVE-2023-45853
+CVE-2026-21491

PR body:
  Release scan started failing this afternoon on a digest that passed this
  morning. Adding the ID so we can ship tonight; will revisit Monday when
  @dpetrova is back.
