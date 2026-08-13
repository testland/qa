# SBOM-diff CI workflows

Full GitHub Actions workflows for the SBOM-diff step of `syft-generation`. The SKILL.md spine
keeps the minimal `jq` gate; the complete CI-gate job, the allowlist pattern,
and the nightly drift-detection workflow live here.

## CI gate on net-new components

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

To allow a pre-approved set of additions (a known intentional dependency
upgrade), maintain an allowlist and subtract matches before the count check:

```bash
UNAPPROVED=$(jq --rawfile allow allowlist.txt \
  '[.added[] | select(.name as $n | $allow | test($n) | not)] | length' \
  diff-result.json)
```

Adjust the gate threshold and allowlist policy to the team's change-control
requirements; the CI step above enforces zero-tolerance as the strictest form.

## Nightly drift detection

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

The "rotate known-good on clean diff" step ensures the baseline advances only
when the image passes the gate, catching regressions introduced in a later
build.
