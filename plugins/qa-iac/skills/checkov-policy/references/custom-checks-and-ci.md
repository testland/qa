# Checkov custom checks and CI integration

## Custom Python checks

```python
# .checkov/custom_checks/cost_center_tag.py
from checkov.common.models.enums import CheckCategories, CheckResult
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class CostCenterTagPresent(BaseResourceCheck):
    def __init__(self):
        super().__init__(
            name="Ensure all EC2 instances have a cost_center tag",
            id="CKV_CUSTOM_001",
            categories=[CheckCategories.GENERAL_SECURITY],
            supported_resources=['aws_instance'],
        )

    def scan_resource_conf(self, conf):
        tags = conf.get('tags', [{}])[0]
        if 'cost_center' in tags:
            return CheckResult.PASSED
        return CheckResult.FAILED

check = CostCenterTagPresent()
```

```bash
checkov -d . --external-checks-dir .checkov/custom_checks
```

For custom YAML policies (no Python required), use the graph-based
`policies/` directory (Checkov supports YAML rules).

## CI integration

```yaml
jobs:
  iac-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with: { python-version: '3.13' }
      - run: pip install checkov
      - name: Run Checkov
        run: checkov -d . --output sarif --output-file-path checkov.sarif --baseline .checkov.baseline
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: checkov.sarif
```

The SARIF upload to GitHub Code Scanning surfaces findings as PR
comments + the Security tab.
