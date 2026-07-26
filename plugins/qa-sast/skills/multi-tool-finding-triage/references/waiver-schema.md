# Waiver file schema and validation

Waivers live in one committed YAML file per domain, named for the gate it feeds
(`.sast-waivers.yaml`, `.dast-waivers.yaml`, `.secrets-waivers.yaml`,
`.sca-waivers.yaml`, `.vuln-waivers.yaml`, `.iac-waivers.yaml`). Step 5 of
`multi-tool-finding-triage` references this file.

## Schema

One schema, with exact-match keys or `*_pattern` glob keys:

```yaml
waivers:
  # exact-match waiver, code / policy domain
  - scanner: scanner-a
    rule_id: js/hardcoded-credentials
    file: src/dev-only-server.js
    line: 42
    reason: "Dev-only server; runs on localhost without TLS by design"
    expires: 2026-12-31
    approved_by: alice@example.com

  # pattern waiver: any scanner, any matching path
  - scanner_pattern: "*"
    rule_id_pattern: "K8S_*"
    file_pattern: "helm/dev-overrides/**"
    reason: "Dev overrides; not deployed to production"
    expires: 2026-09-30
    approved_by: platform-team

  # CVE-domain waiver
  - cve: CVE-2024-1234
    package: lodash@4.17.20
    reason: "Vulnerable function not in the call path; verified via dependency tree"
    expires: 2026-12-31
    approved_by: alice@example.com
```

Matching keys per domain: `scanner` / `rule_id` / `file` / `line` for code and
policy findings, `url_pattern` / `finding_class` for dynamic findings, `cve` /
`package` for CVE findings. Any `*_pattern` variant takes a glob.

## Validation rules

A waiver that fails any of these is rejected, and the underlying finding stays
active:

- `expires:` missing.
- `expires:` in the past relative to today.
- `approved_by:` missing or empty.
- `reason:` missing or empty.

A rejected waiver is never a silent no-op. Report it explicitly, with the reason
for rejection, so the author fixes the waiver instead of assuming it applied.

```python
REQUIRED = ('expires', 'approved_by', 'reason')

def validate_waiver(w, today):
    for field in REQUIRED:
        if not w.get(field):
            return f"missing `{field}:`"       # rejection reason, or None if valid
    return f"expired {w['expires']}" if w['expires'] < today else None
```

## Refuse-to-proceed rules

- Never waive a CVE listed in CISA KEV. Active exploitation in the wild admits no
  acceptable justification
  (https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json).
- Never accept a VEX `not_affected` status with an empty justification
  (https://github.com/openvex/spec/blob/main/OPENVEX-SPEC.md).
- Never auto-fix a finding. Report and recommend only.
- Never suppress a whole severity bucket. Low and info findings still appear in
  the report, below the fold.
