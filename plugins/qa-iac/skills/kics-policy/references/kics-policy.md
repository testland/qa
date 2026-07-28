# kics-policy - deep reference

Detail moved out of the SKILL.md spine to keep the core scan flow lean.

## Pinned versions + binary install

Docker (`docker pull checkmarx/kics:latest`) is the primary path and
carries no version pin. For a binary install, download the
version-stamped release archive (v2.1.20 is the latest release as of
2026-07-20 - bump this pin when updating):

```bash
curl -sfL -o kics.tar.gz \
  https://github.com/Checkmarx/kics/releases/download/v2.1.20/kics_2.1.20_linux_amd64.tar.gz
tar -xzf kics.tar.gz && sudo mv kics /usr/local/bin/
```

## Custom queries (Rego) - full template

KICS queries are written in Rego (same as OPA). A query lives in its own
directory and uses the `Cx` package with a `CxPolicy[result]` rule:

```rego
# custom-queries/aws/cost_center_tag/query.rego
package Cx

CxPolicy[result] {
    resource := input.document[i].resource.aws_instance[name]
    not resource.tags.cost_center
    result := {
        "documentId": input.document[i].id,
        "searchKey": sprintf("aws_instance[%s]", [name]),
        "issueType": "MissingAttribute",
        "keyExpectedValue": "Should have a cost_center tag",
        "keyActualValue": "tags.cost_center is missing",
    }
}
```

Point KICS at the directory:

```bash
kics scan -p . -q ./custom-queries/
```

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| KICS as only IaC scanner                                              | Misses Checkov / tfsec-specific findings.                                | Use multiple scanners; combine results (CI step). |
| `kics-scan ignore-line` without comment justifying                    | Skips invisible.                                                          | Always include reason. |
| Skipping `--fail-on` severity in CI                                    | All findings (including LOW) fail; team disables.                       | Start `--fail-on high,critical`. |
| Running on every PR with full output                                   | Output overwhelming; team ignores.                                      | Severity threshold + JSON/SARIF for triage. |
| Custom queries without tests                                            | Bugs let bad config through.                                              | Test custom queries via OPA test pattern. |
