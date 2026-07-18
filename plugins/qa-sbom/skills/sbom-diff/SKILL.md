---
name: sbom-diff
description: "Compares two CycloneDX or SPDX SBOMs to surface net-new, removed, and version-changed components between image or build versions; uses cyclonedx-cli diff for structured output and syft-based generation for the input SBOMs; gates CI on net-new component introduction; enables supply-chain alerting when unexpected dependencies appear across releases. Use when the team needs to detect dependency drift between container image builds, release candidates, or dependency-update branches."
---

# sbom-diff

## Overview

SBOM diffing is the supply-chain primitive that turns two point-in-time
inventory snapshots into an actionable change signal: which components
are net-new in the target image, which were removed, and which changed
version. Without a diff step, an SBOM is a compliance artifact; with it,
the SBOM becomes a change-control gate.

Per [github.com/CycloneDX/cyclonedx-cli][cdx-cli-gh], the CycloneDX CLI
provides a first-class `diff` subcommand that accepts any two CycloneDX
BOMs (XML, JSON, or Protobuf) and emits structured added/removed/modified
output in text or JSON form.

[cdx-cli-gh]: https://github.com/CycloneDX/cyclonedx-cli

Per [github.com/anchore/syft][sf-gh], Syft generates the per-image CycloneDX
or SPDX SBOMs that feed the diff step; the two tools compose naturally in CI.

[sf-gh]: https://github.com/anchore/syft

**Differentiation vs sibling skills:**

- [`syft-generation`](../syft-generation/SKILL.md) generates SBOMs from a
  single image; it does not compare across versions.
- [`cyclonedx-format`](../cyclonedx-format/SKILL.md) documents the schema;
  it does not run diffs.
- [`grype-scanning`](../grype-scanning/SKILL.md) scans for vulnerabilities
  against a single SBOM; it does not detect drift between builds.

This skill covers the SBOM-to-SBOM comparison workflow end to end.

## When to use

- A container image was rebuilt (base image update, dep update, CI
  pipeline change) and the team needs to know what changed in the
  dependency inventory.
- A release candidate branch must pass a "no unexpected new transitive
  dependencies" gate before merge.
- A scheduled nightly diff monitors a production image tag for supply-chain
  drift vs the last known-good SBOM.
- Post-incident: an unexpected library appeared in a running container and
  the team needs to pinpoint when it was introduced.

## Step 1 - Install cyclonedx-cli

Per [cdx-cli-gh][cdx-cli-gh] install options:

```bash
# Homebrew
brew install cyclonedx/cyclonedx/cyclonedx-cli

# Docker (no local install required)
docker run cyclonedx/cyclonedx-cli diff sbom-from.json sbom-to.json --component-versions

# Binary - download from releases page
# https://github.com/CycloneDX/cyclonedx-cli/releases
# Latest stable: 0.32.0 (2024-05-14)
```

Syft is also required to generate input SBOMs. Per [sf-gh][sf-gh]:

```bash
curl -sSfL https://get.anchore.io/syft | sudo sh -s -- -b /usr/local/bin
# or: brew install syft
```

## Step 2 - Generate the two SBOMs

Per [sf-gh][sf-gh], generate one SBOM per image version in CycloneDX JSON
format (the format accepted by cyclonedx-cli diff):

```bash
# Baseline image (e.g., the last release)
syft myapp:1.0 -o cyclonedx-json=sbom-v1.0.json

# Target image (e.g., the release candidate)
syft myapp:1.1 -o cyclonedx-json=sbom-v1.1.json
```

For local directory scans (non-container builds):

```bash
syft dir:./release-1.0 -o cyclonedx-json=sbom-v1.0.json
syft dir:./release-1.1 -o cyclonedx-json=sbom-v1.1.json
```

Use consistent format and source type across both runs so the diff is
comparing equivalent inventories.

## Step 3 - Run the diff

Per [cdx-cli-gh][cdx-cli-gh], the `diff` subcommand syntax is:

```
cyclonedx diff <from-file> <to-file> [options]
```

Key flags per [cdx-cli-gh][cdx-cli-gh]:

| Flag | Values | Purpose |
|---|---|---|
| `--from-format` | `autodetect`, `json`, `xml`, `protobuf` | Override format detection for the baseline file |
| `--to-format` | `autodetect`, `json`, `xml`, `protobuf` | Override format detection for the target file |
| `--output-format` | `text` (default), `json` | Output style - use `json` for CI parsing |
| `--component-versions` | (flag, no value) | Report added, removed, and version-changed components |

Human-readable diff (text output, default):

```bash
cyclonedx diff sbom-v1.0.json sbom-v1.1.json --component-versions
```

Machine-readable diff (JSON output, for CI gate logic):

```bash
cyclonedx diff sbom-v1.0.json sbom-v1.1.json \
  --component-versions \
  --output-format json \
  > diff-result.json
```

The `--component-versions` flag is the signal flag: without it the diff
reports structural BOM changes; with it it reports the dependency inventory
delta (added, removed, modified components).

## Step 4 - Interpret the output

With `--component-versions --output-format json`, the JSON output contains
three categories of change per [cdx-cli-gh][cdx-cli-gh]:

- **Added** - components present in the target BOM but not the baseline.
  These are net-new dependencies introduced in this image version.
- **Removed** - components present in the baseline but absent from the
  target. Removals may indicate intentional cleanup or an unexpected
  packaging change.
- **Modified** - components present in both, but with a version change.
  A modified entry contains the old and new version values.

Any non-empty "added" list requires review. A component may be:

- An expected transitive dep of a package the team intentionally upgraded
- A net-new package pulled in by a base image update
- An unexpected addition (supply-chain risk, malicious dep injection,
  misconfigured build)

Removals and version changes warrant the same review, especially in
regulated or security-sensitive contexts.

## Step 5 - CI gate on net-new components

The JSON output can be parsed to fail the pipeline when net-new components
appear. Example GitHub Actions step using `jq`:

```yaml
- name: SBOM diff gate
  run: |
    ADDED=$(jq '.added | length' diff-result.json)
    echo "Net-new components: $ADDED"
    if [ "$ADDED" -gt "0" ]; then
      echo "::error::Net-new components detected. Review diff-result.json."
      jq '.added' diff-result.json
      exit 1
    fi
```

To allow a pre-approved set of additions (e.g., a known intentional
dependency upgrade), maintain an allowlist and subtract matches before
the count check:

```bash
UNAPPROVED=$(jq --rawfile allow allowlist.txt \
  '[.added[] | select(.name as $n | $allow | test($n) | not)] | length' \
  diff-result.json)
```

Adjust the gate threshold and allowlist policy to the team's change-control
requirements; the CI step above enforces zero-tolerance as the strictest form.

## Step 6 - Alerting pattern (nightly drift detection)

For production image monitoring, run a nightly diff against the last
known-good SBOM rather than comparing two build artifacts:

```yaml
jobs:
  sbom-drift:
    runs-on: ubuntu-latest
    schedule:
      - cron: "0 2 * * *"
    steps:
      - name: Generate current SBOM
        run: syft myapp:production -o cyclonedx-json=sbom-current.json

      - name: Download last known-good SBOM
        run: |
          aws s3 cp s3://sbom-store/sbom-last-good.json sbom-baseline.json

      - name: Diff
        run: |
          cyclonedx diff sbom-baseline.json sbom-current.json \
            --component-versions --output-format json \
            > drift-result.json

      - name: Alert on drift
        run: |
          ADDED=$(jq '.added | length' drift-result.json)
          REMOVED=$(jq '.removed | length' drift-result.json)
          if [ "$ADDED" -gt "0" ] || [ "$REMOVED" -gt "0" ]; then
            echo "Supply-chain drift detected"
            cat drift-result.json
            # Pipe to Slack/PagerDuty/JIRA as needed
            exit 1
          fi

      - name: Rotate known-good on clean diff
        if: success()
        run: aws s3 cp sbom-current.json s3://sbom-store/sbom-last-good.json
```

The "rotate known-good on clean diff" step ensures the baseline advances
only when the image passes the gate, catching regressions introduced in
a later build.

## Example

Comparing `myapp:2.3.1` (baseline) to `myapp:2.4.0` (candidate):

```bash
syft myapp:2.3.1 -o cyclonedx-json=sbom-2.3.1.json
syft myapp:2.4.0 -o cyclonedx-json=sbom-2.4.0.json
cyclonedx diff sbom-2.3.1.json sbom-2.4.0.json --component-versions --output-format json
```

Truncated example JSON output per [cdx-cli-gh][cdx-cli-gh] documented
output shape (added/removed/modified keys):

```json
{
  "added": [
    {"name": "protobuf", "version": "4.25.3", "type": "library"}
  ],
  "removed": [],
  "modified": [
    {"name": "openssl", "from-version": "3.1.4", "to-version": "3.3.0", "type": "library"}
  ]
}
```

The team reviews: `protobuf` is net-new. If it is a known transitive dep of
a gRPC library the team deliberately upgraded, it is added to the allowlist.
If unexplained, the release is blocked pending investigation.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Diff without `--component-versions` | Reports only structural BOM metadata changes, not dependency inventory delta | Always pass `--component-versions` |
| Compare SBOMs generated by different tools or formats without normalizing | Format differences appear as false-positive diffs | Use the same generator and `--output-format` for both runs |
| Treat removed components as low-priority | Removals can indicate silent packaging changes hiding a dep under a new name | Review removed list alongside added list |
| Gate only on count, not content | A single legitimate dep addition will block valid releases permanently | Pair count gate with an allowlist (Step 5) |
| Generate SBOMs at different scan depths (`dir:` vs image) | Inconsistent cataloger scope produces noisy diffs | Match source type across baseline and target runs |

## Limitations

- cyclonedx-cli diff operates on CycloneDX format (XML, JSON, Protobuf)
  per [cdx-cli-gh][cdx-cli-gh]; SPDX-format SBOMs require conversion first
  via `cyclonedx convert` before diffing.
- The diff output reflects component-level inventory changes, not
  vulnerability changes. Pair with [`grype-scanning`](../grype-scanning/SKILL.md)
  to assess whether net-new components carry known CVEs.
- Syft inventory accuracy affects diff signal quality: if Syft misses a
  component in one scan but not the other, the diff will misattribute the
  delta. See the accuracy-validation section in
  [`syft-generation`](../syft-generation/SKILL.md).
- For multi-arch images, diff each platform separately using
  `--platform=linux/amd64` on both Syft runs; a combined diff of mixed-arch
  SBOMs will conflate platform-specific inventory as change.

## References

- [cdx-cli-gh][cdx-cli-gh] - cyclonedx-cli repository: install, subcommand
  reference, diff flags, output format documentation
- [sf-gh][sf-gh] - Syft repository: SBOM generation, output formats,
  source types
- [`syft-generation`](../syft-generation/SKILL.md) - generate the input SBOMs
- [`cyclonedx-format`](../cyclonedx-format/SKILL.md) - CycloneDX schema reference
- [`grype-scanning`](../grype-scanning/SKILL.md) - vuln-scan net-new components
  after the diff gate passes
