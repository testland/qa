# Procurement review due the 18th, and we are answering both halves with one CI step

## Problem Description

Nordvind Bank's supplier review is due back on the 18th and Section 4 is the
part I cannot sign. It wants a CycloneDX bill of materials for the released
`checkout-api` container, and separately it wants evidence that our build fails
on serious vulnerabilities. The section is attached.

One of our staff engineers has already drafted it and it is sitting in a branch.
He produces both answers from the single scanning step we already run at release
time: the step emits the bill of materials to a file, that file is attached to
the GitHub release and mailed to their reviewer, and the same step's exit status
is the gate evidence. His argument, which I have some sympathy with, is that we
already carry one scanner in the release image and he does not want to add a
second binary to the build just to satisfy a questionnaire. He has tested it —
the file parses, it validates as CycloneDX 1.5, and it loads in their supplier
portal without complaint.

Attached: the drafted workflow, Section 4 of the review, the document the draft
produced from last Thursday's release build, and the tail of our nightly job
against the same digest.

Their process note says an incomplete inventory is returned to the supplier and
restarts a ten-working-day clock, which would put us past the contract date, so
I would rather find out now than on the 18th.

## Output Specification

1. Edit `.github/workflows/release.yml` so both answers can be signed.
2. Write `docs/customer-review-section-4.md`: the response to 4.1 and to 4.2,
   naming the artifact each one points at, and anything we have to tell them
   about the limits of what we are sending.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/release.yml ===============
name: release

on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - name: build and push
        run: |
          docker build -t registry.internal/checkout-api:${{ github.ref_name }} .
          docker push registry.internal/checkout-api:${{ github.ref_name }}

      - name: scan, gate and produce the bill of materials
        run: |
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v ${{ github.workspace }}:/out \
            aquasec/trivy:0.58.2 image \
              --severity HIGH,CRITICAL \
              --ignore-unfixed \
              --format cyclonedx \
              --output /out/sbom.cdx.json \
              --exit-code 1 \
              registry.internal/checkout-api:${{ github.ref_name }}

      - uses: softprops/action-gh-release@v2
        with:
          files: sbom.cdx.json

=============== FILE: docs/customer-security-review.md ===============
# Nordvind Bank — supplier security review, Section 4: software composition

**4.1** Supply a CycloneDX 1.5 bill of materials for the released container
image, enumerating its components, with any known vulnerabilities recorded
against them. State the date and the image digest it was produced from.

**4.2** Provide evidence that your build pipeline fails when a high-severity
vulnerability with an available fix is present in the released image.

**Process note.** Responses are reviewed within ten working days. An inventory
assessed as incomplete is returned to the supplier and the ten-day clock
restarts from the corrected resubmission. Returned to: procurement-sec@nordvind.
Due: 2026-09-18.

=============== FILE: artifacts/README.txt ===============
sbom.cdx.json below is the file the drafted step produced from the v4.12.1
release build on 2026-09-11, digest sha256:6ae0b31d77c4.

It is reproduced with its components array truncated to the first six of the
214 it contains, for readability. The vulnerabilities array is complete and is
exactly as emitted — four entries.

=============== FILE: artifacts/sbom.cdx.json ===============
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:2f1c9a10-6b64-4a7e-9d51-0a7c2e884f31",
  "version": 1,
  "metadata": {
    "timestamp": "2026-09-11T04:22:18Z",
    "component": {
      "type": "container",
      "name": "registry.internal/checkout-api",
      "version": "sha256:6ae0b31d77c4"
    }
  },
  "components": [
    { "type": "library", "name": "libssl3", "version": "3.0.14-1~deb12u2", "purl": "pkg:deb/debian/libssl3@3.0.14-1~deb12u2" },
    { "type": "library", "name": "libc6", "version": "2.36-9+deb12u8", "purl": "pkg:deb/debian/libc6@2.36-9+deb12u8" },
    { "type": "library", "name": "libexpat1", "version": "2.5.0-1", "purl": "pkg:deb/debian/libexpat1@2.5.0-1" },
    { "type": "library", "name": "undici", "version": "6.21.1", "purl": "pkg:npm/undici@6.21.1" },
    { "type": "library", "name": "express", "version": "4.19.2", "purl": "pkg:npm/express@4.19.2" },
    { "type": "library", "name": "pino", "version": "9.4.0", "purl": "pkg:npm/pino@9.4.0" }
  ],
  "vulnerabilities": [
    { "id": "CVE-2025-30208", "ratings": [ { "severity": "high" } ], "affects": [ { "ref": "pkg:npm/vite@5.4.8" } ] },
    { "id": "CVE-2024-21538", "ratings": [ { "severity": "high" } ], "affects": [ { "ref": "pkg:npm/cross-spawn@7.0.3" } ] },
    { "id": "CVE-2025-48387", "ratings": [ { "severity": "critical" } ], "affects": [ { "ref": "pkg:npm/tar-fs@3.0.4" } ] },
    { "id": "CVE-2024-9143", "ratings": [ { "severity": "high" } ], "affects": [ { "ref": "pkg:deb/debian/libssl3@3.0.11-1~deb12u2" } ] }
  ]
}

=============== FILE: reports/nightly-2026-09-11.txt ===============
$ nightly inventory job, same digest sha256:6ae0b31d77c4, no thresholds applied

registry.internal/checkout-api (debian 12.7)
Total: 137 (UNKNOWN: 0, LOW: 44, MEDIUM: 62, HIGH: 27, CRITICAL: 4)

app/package-lock.json (npm)
Total: 19 (UNKNOWN: 0, LOW: 3, MEDIUM: 9, HIGH: 6, CRITICAL: 1)

Of the 156 findings above, 117 have no fixed version published.
Components enumerated: 214.
