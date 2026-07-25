# Machine-readable output and CI integration

Deep reference for `wcag-compliance-reporter` SKILL.md. Consult when wiring the
compliance report into a dashboard / ACR pipeline or running the aggregation in
CI on every push.

## Machine-readable output

In addition to the markdown, emit `compliance.json` for downstream consumption
(dashboards, ASR, programmatic gates):

```json
{
  "generatedAt": "2026-05-05T14:00:00Z",
  "site": "example.com",
  "verdict": { "A": "non-conformant", "AA": "non-conformant", "AAA": "unknown" },
  "processes": [
    { "name": "checkout", "pagesSpec": [...], "pagesScanned": [...], "complete": false },
    { "name": "account", "pagesSpec": [...], "pagesScanned": [...], "complete": true }
  ],
  "violations": [...]
}
```

## CI integration

```yaml
- name: Run scanners
  run: |
    npx pa11y-ci   --json > pa11y.json
    npx @axe-core/cli https://staging.example.com > axe.json
    npx lighthouse-batch -s https://staging.example.com -o reports/

- name: Aggregate + report
  run: python scripts/wcag_compliance.py \
        --pa11y pa11y.json \
        --axe axe.json \
        --lighthouse reports/ \
        --pages-spec pages-to-scan.yaml \
        --out compliance/

- name: Upload
  uses: actions/upload-artifact@v4
  with:
    name: wcag-compliance
    path: compliance/
```
