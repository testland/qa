# Same digest scanned twice today, two different answers, and I have a 20:00 ship window

## Problem Description

I am the release manager for `checkout-api` and I need a decision before 20:00.

The exact same artifact — `registry.internal/checkout-api@sha256:c41e7b9a0f28`,
one digest, nothing rebuilt — was scanned twice today. At 09:14 the pull-request
job reported nothing blocking and the change merged. At 16:02 the release job on
that same digest reported one CRITICAL and failed. Nobody touched the image
between those two runs and nobody touched either workflow.

The team's read on Slack this afternoon, in order of appearance:

- "the scanner is flaky, give it a retry step and move on"
- "it passed this morning on the same digest, just re-run the release job"
- "if it comes back again put the identifier in the suppression file, we can do
  it properly on Monday"

Someone acted on the third one and opened PR #4508, which is attached. It is
approved by one reviewer and waiting on me.

I have attached both job logs, an ad-hoc run one of our engineers did at 16:41
while arguing with the second suggestion, both workflow files, and the current
suppression file. What I need is whether we ship at 20:00, and something that
stops one artifact producing two different answers in the same working day,
because I cannot defend this to the release board a third time this quarter.

## Output Specification

1. Write `docs/release-4.12.2-go-no-go.md`: the decision for 20:00, what
   actually differs between the two runs and what does not, and what changes in
   the pipeline.
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

┌───────────┬────────────────┬──────────┬──────────────────────┬──────────────────────┬──────────────┐
│  Library  │ Vulnerability  │ Severity │      Installed       │        Fixed         │ Published    │
├───────────┼────────────────┼──────────┼──────────────────────┼──────────────────────┼──────────────┤
│ libcurl4  │ CVE-2026-21491 │ CRITICAL │ 7.88.1-10+deb12u7    │ 7.88.1-10+deb12u9    │ 2026-09-12   │
└───────────┴────────────────┴──────────┴──────────────────────┴──────────────────────┴──────────────┘

app/package-lock.json (npm)
Total: 0 (HIGH: 0, CRITICAL: 0)

Process exited with code 1

=============== FILE: logs/adhoc-2026-09-13-1641.txt ===============
# run by hand by @dpetrova, laptop, pinned to the same build the morning job used
$ docker run --rm -v $HOME/.cache/trivy:/root/.cache/trivy \
    aquasec/trivy:0.58.2 image --severity HIGH,CRITICAL --ignore-unfixed \
    registry.internal/checkout-api@sha256:c41e7b9a0f28

Version: 0.58.2
Vulnerability DB:
  UpdatedAt: 2026-09-13 06:09:12 +0000 UTC

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
