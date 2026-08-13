# Grype `.grype.yaml` ignore rules

Full suppression examples for the Grype scan step of `syft-generation`. Per
[github.com/anchore/grype][gr-gh]: "Configuration can be managed
through `.grype.yaml` files with ignore rules for customized
scanning behavior."

## Example config

```yaml
# .grype.yaml
ignore:
  # Per-CVE ignore
  - vulnerability: CVE-2024-1234
    reason: "Reachability analysis confirms unreachable; tracked in JIRA-1234"
    expires: 2026-12-15

  # Per-package + version ignore
  - package:
      name: lodash
      version: 4.17.20
    vulnerability: CVE-2024-5678
    reason: "Test fixture; not in production dependency graph"
    expires: 2026-09-30

  # Pattern-based ignore (per-fix-state)
  - vulnerability: GHSA-*
    fix-state: not-fixed
    reason: "Pending vendor fix; not exploitable in our context"
    expires: 2026-12-15
```

## Justification template (mandatory in `.grype.yaml`)

Every ignore entry needs a reachability reason, an approver, and an
expiry date:

```yaml
ignore:
  - vulnerability: CVE-2024-1234
    reason: |
      Reachability: vulnerable function `parse_xml` not called from
      production code paths (verified via static analysis 2026-05-15).
      Component is required for test fixtures only.
    approved-by: alice@example.com
    expires: 2026-09-15
    re-review-date: 2026-09-15
```

[gr-gh]: https://github.com/anchore/grype
