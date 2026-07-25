# GRC-platform delivery and CI automation

Deep reference for `compliance-evidence-generator` SKILL.md. Consult once the
evidence package is bundled (SKILL.md Step 6) and you need to deliver it to a
GRC platform and automate the whole run in CI.

## Upload to the GRC platform

The assembled package feeds into whichever GRC platform the engagement uses.
All three major platforms accept manual evidence upload when no native
integration covers the control:

| Platform | Manual upload path |
|---|---|
| Vanta | Controls -> Select control -> "Add evidence" -> upload file |
| Drata | Controls -> Control detail -> Evidence tab -> Upload |
| Secureframe | Controls -> Evidence -> Attach |

For controls with native integrations (e.g., Vanta's GitHub integration for
CC8.1 change management), prefer the integration over manual upload. Use this
skill only to fill gaps the integration cannot cover, or when the GRC platform
is not yet in use.

## CI integration

Evidence generation should run automatically on every merge to main (or
nightly for continuous-monitoring controls):

```yaml
# .github/workflows/compliance-evidence.yml
name: Compliance Evidence
on:
  push:
    branches: [main]
  schedule:
    - cron: "0 2 * * *"     # nightly UTC

jobs:
  evidence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run compliance test suite
        run: pytest compliance_tests/ --json-report --json-report-file=results/test-run.json
      - name: Build evidence package
        run: python scripts/build_evidence_package.py
      - name: Upload evidence artifact
        uses: actions/upload-artifact@v4
        with:
          name: compliance-evidence-${{ github.run_id }}
          path: evidence-package-*/
          retention-days: 365   # retain for full observation period + buffer
```

Set `retention-days` to cover the audit's observation period plus a buffer.
PCI DSS v4.0.1 Requirement 10 requires log and evidence retention of at least
12 months with the most recent 3 months immediately available
(source: pcisecuritystandards.org).
