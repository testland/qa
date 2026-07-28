# trivy-config - deep reference

Long inline blocks moved out of the SKILL.md spine to keep the core scan
flow lean. Version pins referenced below live in the Pinned versions
section of SKILL.md.

## Custom Rego policy - full example

Per [trivy.dev custom checks docs](https://trivy.dev/latest/docs/scanner/misconfiguration/custom/),
each policy file requires a unique package declaration and a METADATA
annotation block:

```rego
# policies/require_cost_center_tag.rego
# METADATA
# title: "EC2 instances must have cost_center tag"
# description: "Untagged resources cannot be allocated to cost centers"
# schemas:
#   - input: schema["cloud"]
# custom:
#   id: USER-TF-001
#   severity: HIGH
#   input:
#     selector:
#       - type: cloud

package user.terraform.USER-TF-001

import rego.v1

deny contains res if {
    instance := input.aws.ec2.instances[_]
    not instance.tags["cost_center"]
    res := result.new(
        sprintf("EC2 instance '%s' missing cost_center tag", [instance.id.value]),
        instance,
    )
}
```

The `--namespaces` value (here: `user`) must match the first segment of
the package path. Supported `input.selector` types include `cloud`
(Terraform / CloudFormation), `kubernetes`, `dockerfile`, `yaml`,
`json`, `toml`, and `terraform-raw`.

## GitHub Actions workflow - full YAML

SARIF output integrates directly with GitHub Code Scanning. The
`if: always()` on the upload step ensures findings appear in the
Security tab even when the scan step exits non-zero:

```yaml
# .github/workflows/trivy-iac.yml
jobs:
  trivy-config:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v5

      - name: Run Trivy config scan
        uses: aquasecurity/trivy-action@0.31.0
        with:
          scan-type: config
          scan-ref: .
          severity: HIGH,CRITICAL
          exit-code: 1
          format: sarif
          output: trivy.sarif
          ignore-unfixed: true

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: trivy.sarif
```
