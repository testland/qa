# tfsec custom rules and CI integration

## Custom rules

```yaml
# .tfsec/custom_checks.yml
checks:
  - code: CUS001
    description: Ensure all EC2 instances have a cost_center tag
    impact: Untagged resources cannot be allocated to cost centers
    resolution: Add a cost_center tag
    requiredTypes:
      - resource
    requiredLabels:
      - aws_instance
    severity: HIGH
    matchSpec:
      name: tags
      action: contains
      value: cost_center
    errorMessage: EC2 instance is missing cost_center tag
```

## CI integration

```yaml
jobs:
  tfsec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: aquasecurity/tfsec-action@v1.0.3
        with:
          additional_args: --minimum-severity HIGH
          format: sarif
          output_file_path: tfsec.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: tfsec.sarif
```
