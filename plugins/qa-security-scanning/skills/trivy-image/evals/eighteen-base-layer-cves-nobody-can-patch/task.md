# Eighteen CVEs in the base layer, no patches exist, and we ship Thursday

## Problem Description

`checkout-api` 4.12.0 goes out Thursday morning. The release gate fails the
build on HIGH and CRITICAL container findings, and right now it fails: 312
findings on the image, 44 of them at HIGH or CRITICAL.

A contractor spent last week going through them. His conclusion was that 18 of
the 44 sit in the Debian base layer with no patched package published by the
distribution, and his recommendation was to drop those 18 identifiers into the
suppression file, get the gate green, and revisit in six months when we do the
base-image bump. His list is attached. So is the machine-readable report from
the failing run — trimmed to the 18 he listed plus the four highest-severity
findings he did not — and the gate workflow itself.

I am inclined to take the recommendation, because I cannot patch what Debian has
not patched and I have a release Thursday. But he left on Friday, the file he
wants me to merge switches off 18 findings in one commit, and I would like a
second pair of eyes before I do that.

We already have a suppression file with two entries in it from last year. I do
not know who added them or why; it predates me.

Tell me what actually belongs in that file, what has to happen before Thursday,
and whether we ship.

## Output Specification

1. Write `.trivyignore` as it should stand after your review — including
   whatever you decide about the two entries already in it.
2. Edit `.github/workflows/release-gate.yml` if the gating command needs to
   change.
3. Write `docs/cve-response-4.12.0.md`: your verdict on the contractor's
   recommendation, anything that must be fixed rather than suppressed and who
   has to do it before Thursday, and a plain answer on whether 4.12.0 ships.

## Input Files

Extract the following files before beginning.

=============== FILE: .trivyignore ===============
CVE-2023-45853
CVE-2024-2511

=============== FILE: proposed/contractor-suppression-list.txt ===============
# checkout-api 4.12.0 - base layer findings with no distribution patch
# Prepared by: J. Halvorsen (contract, ends 2026-09-05)
# Recommendation: add all of the below to the suppression file, re-open at the
# next base-image bump (planned Q1).

CVE-2024-6119
CVE-2023-31484
CVE-2024-41996
CVE-2023-45918
CVE-2022-27943
CVE-2024-33601
CVE-2024-45491
CVE-2023-39804
CVE-2024-26462
CVE-2022-3219
CVE-2025-27113
CVE-2023-50495
CVE-2024-28085
CVE-2023-4039
CVE-2024-0553
CVE-2022-41409
CVE-2023-7008
CVE-2024-52533

=============== FILE: .github/workflows/release-gate.yml ===============
name: release-gate

on:
  push:
    tags: ["v*"]

jobs:
  image-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: docker build -t checkout-api:${{ github.ref_name }} .
      - name: scan
        run: |
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -v ${{ github.workspace }}:/work -w /work \
            aquasec/trivy:0.58.2 image \
              --severity HIGH,CRITICAL \
              --format table \
              --exit-code 1 \
              checkout-api:${{ github.ref_name }}

=============== FILE: reports/checkout-api-4.12.0.json ===============
{
  "ArtifactName": "checkout-api:4.12.0",
  "ArtifactType": "container_image",
  "Metadata": { "OS": { "Family": "debian", "Name": "12.7" } },
  "Results": [
    {
      "Target": "checkout-api:4.12.0 (debian 12.7)",
      "Class": "os-pkgs",
      "Type": "debian",
      "Vulnerabilities": [
        { "VulnerabilityID": "CVE-2024-6119", "PkgName": "libssl3", "InstalledVersion": "3.0.11-1~deb12u2", "FixedVersion": "3.0.14-1~deb12u2", "Severity": "CRITICAL" },
        { "VulnerabilityID": "CVE-2023-31484", "PkgName": "perl-base", "InstalledVersion": "5.36.0-7+deb12u1", "FixedVersion": "", "Severity": "CRITICAL" },
        { "VulnerabilityID": "CVE-2024-41996", "PkgName": "openssl", "InstalledVersion": "3.0.11-1~deb12u2", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2023-45918", "PkgName": "libncursesw6", "InstalledVersion": "6.4-4", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2022-27943", "PkgName": "libstdc++6", "InstalledVersion": "12.2.0-14", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2024-33601", "PkgName": "libc-bin", "InstalledVersion": "2.36-9+deb12u8", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2024-45491", "PkgName": "libexpat1", "InstalledVersion": "2.5.0-1", "FixedVersion": "2.5.0-1+deb12u1", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2023-39804", "PkgName": "tar", "InstalledVersion": "1.34+dfsg-1.2+deb12u1", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2024-26462", "PkgName": "libkrb5-3", "InstalledVersion": "1.20.1-2+deb12u2", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2022-3219", "PkgName": "gpgv", "InstalledVersion": "2.2.40-1.1", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2025-27113", "PkgName": "libxml2", "InstalledVersion": "2.9.14+dfsg-1.3~deb12u1", "FixedVersion": "2.9.14+dfsg-1.3~deb12u2", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2023-50495", "PkgName": "libtinfo6", "InstalledVersion": "6.4-4", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2024-28085", "PkgName": "bsdutils", "InstalledVersion": "1:2.38.1-5+deb12u1", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2023-4039", "PkgName": "libgcc-s1", "InstalledVersion": "12.2.0-14", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2024-0553", "PkgName": "libgnutls30", "InstalledVersion": "3.7.9-2+deb12u2", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2022-41409", "PkgName": "libpcre2-8-0", "InstalledVersion": "10.42-1", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2023-7008", "PkgName": "libsystemd0", "InstalledVersion": "252.30-1~deb12u2", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2024-52533", "PkgName": "libglib2.0-0", "InstalledVersion": "2.74.6-2+deb12u4", "FixedVersion": "", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2024-9143", "PkgName": "libssl3", "InstalledVersion": "3.0.11-1~deb12u2", "FixedVersion": "3.0.15-1~deb12u1", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2025-24528", "PkgName": "libkrb5-3", "InstalledVersion": "1.20.1-2+deb12u2", "FixedVersion": "1.20.1-2+deb12u3", "Severity": "HIGH" }
      ]
    },
    {
      "Target": "app/package-lock.json",
      "Class": "lang-pkgs",
      "Type": "npm",
      "Vulnerabilities": [
        { "VulnerabilityID": "CVE-2025-30208", "PkgName": "vite", "InstalledVersion": "5.4.8", "FixedVersion": "5.4.15", "Severity": "HIGH" },
        { "VulnerabilityID": "CVE-2024-21538", "PkgName": "cross-spawn", "InstalledVersion": "7.0.3", "FixedVersion": "7.0.5", "Severity": "HIGH" }
      ]
    }
  ]
}
