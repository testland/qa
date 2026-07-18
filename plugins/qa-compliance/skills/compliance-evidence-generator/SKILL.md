---
name: compliance-evidence-generator
description: "Build-an-X workflow that produces auditor-facing evidence packages from automated test results: maps control IDs to test outcomes across any compliance framework (SOC 2, ISO 27001, HIPAA, PCI DSS, GDPR, FedRAMP); generates the control-evidence matrix, timestamped evidence bundles (screenshots, log excerpts, CI exports), and chain-of-custody notes per NIST SP 800-72. Distinct from soc2-evidence-collector (SOC2-only raw log harvest) and from read-only coverage gap analysis that produces no artifacts. Use when an audit engagement requires auditor-ready evidence packages built from existing automated test output."
keywords:
  - compliance
  - evidence
  - audit
  - control-mapping
  - evidence-package
  - chain-of-custody
  - SOC2
  - ISO27001
  - HIPAA
  - PCI-DSS
  - GDPR
---

# compliance-evidence-generator

## Overview

Auditors need more than passing tests. They require structured artifacts
that map each control to verified outcomes, carry timestamps, and establish
chain of custody. Per the NIST Computer Security Resource Center glossary
(csrc.nist.gov/glossary/term/chain_of_custody, sourced NIST SP 800-72),
chain of custody is "a process that tracks the movement of evidence through
its collection, safeguarding, and analysis lifecycle by documenting each
person who handled the evidence, the date/time it was collected or
transferred, and the purpose for the transfer."

Per ISACA's Interactive Glossary (isaca.org/resources/glossary), an
artifact is "a form of objective evidence that is an output of the work
being performed and the process being followed." Both definitions anchor
this skill: the output is objective, output-of-work artifacts with
documented custody - not raw logs and not mere coverage reports.

This skill differs from its sibling skills:

| Skill | Scope |
|---|---|
| `soc2-evidence-collector` | SOC 2 TSC-specific: harvests raw Okta/IDP/CI logs per TSC criterion |
| `audit-trail-test-author` | Authors tamper-evident audit-log tests per framework |
| read-only compliance-readiness review | Read-only gap analysis: reviews coverage without producing artifacts |
| **`compliance-evidence-generator`** | Cross-framework: assembles auditor-ready packages from any test output |

## When to use

- An audit engagement opens (SOC 2 Type II, ISO 27001 surveillance, PCI
  DSS annual ROC, HIPAA OCR inquiry, GDPR supervisory authority request).
- A GRC platform requests evidence upload for controls that have no native
  integration.
- CI now produces test results but they are not yet mapped to control IDs.
- A previous audit finding cited "insufficient evidence" for a control that
  is actually tested.

## Step 1 - Build the control-to-test map

Start by resolving which test (or test suite) owns each in-scope control.
Controls come from the applicable framework:

| Framework | Control catalog |
|---|---|
| SOC 2 | AICPA Trust Services Criteria 2017 (rev. 2022 points of focus) - CC1-CC9, A1, C1, PI1, P1-P9 |
| ISO 27001:2022 | Annex A controls (cited by ID: A.5 through A.8) |
| PCI DSS v4.0.1 | Requirements 1-12 and associated testing procedures |
| HIPAA Security Rule | 45 CFR Part 164 Subpart C safeguards (Administrative, Physical, Technical) |
| GDPR | Art. 5(2), Art. 24, and Art. 30 accountability obligations per gdpr-info.eu |
| FedRAMP / NIST 800-53 Rev 5 | AU, AC, CM, SI, IR, and other control families |

Produce a YAML or JSON mapping file, not a spreadsheet. Spreadsheets cannot
be diff-reviewed or version-controlled cleanly:

```yaml
# control-map.yaml
controls:
  - id: CC6.1            # SOC 2 Trust Services Criterion
    framework: soc2
    description: "Logical and physical access controls"
    tests:
      - suite: access_control_tests
        test_id: test_mfa_enforced_for_all_admin_accounts
      - suite: access_control_tests
        test_id: test_offboarded_user_revoked_within_sla
  - id: "ISO-A.8.3"       # ISO 27001:2022 Annex A
    framework: iso27001
    description: "Information access restriction"
    tests:
      - suite: rbac_tests
        test_id: test_role_least_privilege_enforced
  - id: PCI-10.2.1        # PCI DSS v4.0.1 Requirement 10
    framework: pci_dss
    description: "Audit log entries generated per 10.2.1"
    tests:
      - suite: audit_log_tests
        test_id: test_all_required_event_types_logged
```

One control may reference multiple tests. One test may satisfy multiple
controls. Both are valid; record them.

## Step 2 - Run tests and capture structured results

Test output must be machine-readable. Ad-hoc terminal output is not
evidence. Accepted formats: JUnit XML, pytest JSON report (via
`pytest-json-report`), Jest JSON (via `--json`), or any format parseable
by the evidence assembler in Step 4.

```bash
# pytest with JSON output (pytest-json-report)
pytest --json-report --json-report-file=results/test-run-$(date -u +%Y%m%dT%H%M%SZ).json

# Jest with JSON output
npx jest --json --outputFile=results/test-run-$(date -u +%Y%m%dT%H%M%SZ).json

# JUnit XML (e.g., from Maven / Gradle / Robot Framework)
# output path depends on build tool - pass to Step 4 parser
```

Timestamp the file name at collection time (UTC). The collection timestamp
is the first chain-of-custody data point.

## Step 3 - Collect supporting evidence artifacts

Automated test results are the primary evidence. Supporting artifacts
provide auditors with context:

**Screenshots (UI controls tests)**

```python
# In Playwright / Selenium tests, save on pass as well as failure:
def capture_evidence_screenshot(page, control_id, test_name):
    path = f"evidence/{control_id}/{test_name}_{datetime.utcnow().isoformat()}.png"
    page.screenshot(path=path)
    return path
```

**Log excerpts (access / audit / system logs)**

Excerpts must be bounded and labeled. Unbounded log dumps are not evidence;
they are noise that increases auditor workload and reduces the signal value
of the artifact:

```python
def extract_log_excerpt(log_source, start_utc, end_utc, control_id):
    """Extract the log window relevant to a control test run."""
    return {
        "control_id": control_id,
        "log_source": log_source,
        "window_start": start_utc.isoformat(),
        "window_end": end_utc.isoformat(),
        "lines": fetch_log_lines(log_source, start_utc, end_utc),
        "collected_at": datetime.utcnow().isoformat(),
        "collector": "compliance-evidence-generator",
    }
```

**CI pipeline exports**

Export the CI run as a permanent artifact (GitHub Actions: `actions/upload-artifact`,
GitLab: `artifacts:paths`, CircleCI: `store_artifacts`). The artifact URL
or download reference goes into the chain-of-custody record (Step 5).

## Step 4 - Assemble the control-evidence matrix

The matrix is the auditor's index. It maps every in-scope control to its
evidence files with pass/fail status and collection metadata.

```python
import json, datetime, pathlib

def build_evidence_matrix(control_map_path, test_results_path, artifact_dir):
    control_map = load_yaml(control_map_path)
    test_results = load_json(test_results_path)
    matrix = []

    for control in control_map["controls"]:
        row = {
            "control_id": control["id"],
            "framework": control["framework"],
            "description": control["description"],
            "status": "PASS",
            "tests": [],
            "artifacts": [],
        }
        for test_ref in control["tests"]:
            result = find_test_result(test_results, test_ref["suite"], test_ref["test_id"])
            row["tests"].append({
                "test_id": test_ref["test_id"],
                "outcome": result["outcome"],      # PASS / FAIL / SKIP / ERROR
                "duration_ms": result["duration"],
                "run_at": result["timestamp"],
            })
            if result["outcome"] != "PASS":
                row["status"] = "FAIL"
            # Attach any per-test artifact files
            for artifact in glob_artifacts(artifact_dir, test_ref["test_id"]):
                row["artifacts"].append(str(artifact))

        matrix.append(row)

    output = {
        "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
        "generator": "compliance-evidence-generator",
        "controls": matrix,
    }
    pathlib.Path("evidence/control-evidence-matrix.json").write_text(
        json.dumps(output, indent=2)
    )
    return output
```

Render the matrix as both JSON (machine-readable for GRC platform upload)
and Markdown (human-readable for auditor review):

```python
def render_matrix_markdown(matrix):
    lines = [
        "# Control-Evidence Matrix",
        f"Generated: {matrix['generated_at']}",
        "",
        "| Control ID | Framework | Description | Status | Tests | Artifacts |",
        "|---|---|---|---|---|---|",
    ]
    for c in matrix["controls"]:
        tests = ", ".join(t["test_id"] for t in c["tests"])
        artifacts = ", ".join(c["artifacts"])
        lines.append(
            f"| {c['control_id']} | {c['framework']} | {c['description']} "
            f"| {c['status']} | {tests} | {artifacts} |"
        )
    pathlib.Path("evidence/control-evidence-matrix.md").write_text("\n".join(lines))
```

## Step 5 - Write chain-of-custody notes

NIST SP 800-72 (the source of the chain-of-custody definition used above)
requires documenting each person who handled the evidence, the date/time
of collection or transfer, and the purpose of the transfer. Apply this
to each evidence file:

```json
{
  "evidence_file": "evidence/CC6.1/test_mfa_enforced_20260604T143000Z.json",
  "control_id": "CC6.1",
  "collected_at": "2026-06-04T14:30:00Z",
  "collected_by": "ci-runner:github-actions:run-12345",
  "collection_method": "automated-test-result-export",
  "ci_run_url": "https://github.com/org/repo/actions/runs/12345",
  "artifact_url": "https://github.com/org/repo/actions/runs/12345/artifacts/67890",
  "transferred_to": "GRC platform evidence upload",
  "transferred_at": "2026-06-04T15:00:00Z",
  "transferred_by": "alice@example.com",
  "purpose": "SOC 2 Type II audit evidence submission - observation period Q2 2026",
  "hash_sha256": "abc123...",
  "notes": "Test run triggered by merge to main; no manual intervention."
}
```

Hash each artifact file (SHA-256) and record the hash in the custody note.
Any tampering after collection breaks the hash and invalidates the artifact.
This is the automated-evidence equivalent of the forensic-evidence integrity
requirement in NIST SP 800-72.

## Step 6 - Bundle the evidence package

The evidence package is the deliverable the auditor or GRC platform receives.
Standard layout:

```
evidence-package-<engagement>-<date>/
  README.txt                          # engagement context, collection period, contacts
  control-evidence-matrix.json        # Step 4 machine-readable matrix
  control-evidence-matrix.md          # Step 4 human-readable matrix
  chain-of-custody/
    custody-<control-id>.json         # Step 5 per-control custody notes
  artifacts/
    <control-id>/
      <test-name>_<timestamp>.json    # test result excerpt
      <test-name>_<timestamp>.png     # screenshot (if applicable)
      <test-name>_<timestamp>.log     # log excerpt (if applicable)
  raw/
    test-run-<timestamp>.json         # full test results export (Step 2)
```

Produce the bundle as a deterministic archive (tar + gzip or zip with
stable sort order) so the archive hash is reproducible from the same inputs.
Record the archive hash in the final custody note.

```bash
# Reproducible archive (GNU tar with --sort)
tar --sort=name -czf \
  "evidence-package-${ENGAGEMENT}-$(date -u +%Y%m%d).tar.gz" \
  evidence-package-*/
sha256sum "evidence-package-${ENGAGEMENT}-$(date -u +%Y%m%d).tar.gz" \
  > "evidence-package-${ENGAGEMENT}-$(date -u +%Y%m%d).tar.gz.sha256"
```

## Step 7 - Upload to GRC platform

The assembled package feeds into whichever GRC platform the engagement uses.
All three major platforms accept manual evidence upload when no native
integration covers the control:

| Platform | Manual upload path |
|---|---|
| Vanta | Controls -> Select control -> "Add evidence" -> upload file |
| Drata | Controls -> Control detail -> Evidence tab -> Upload |
| Secureframe | Controls -> Evidence -> Attach |

For controls with native integrations (e.g., Vanta's GitHub integration for
CC8.1 change management), prefer the integration over manual upload. Use
this skill only to fill gaps the integration cannot cover, or when the GRC
platform is not yet in use.

## Step 8 - CI integration

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
12 months with the most recent 3 months immediately available.

## GDPR accountability note

GDPR Art. 5(2) (gdpr-info.eu/art-5-gdpr) places the burden of proof on
the controller: it "shall be responsible for, and be able to demonstrate
compliance with, paragraph 1." Art. 24 (gdpr-info.eu/art-24-gdpr) requires
controllers to "implement appropriate technical and organisational measures
to ensure and to be able to demonstrate that processing is performed in
accordance with this Regulation." Art. 30 (gdpr-info.eu/art-30-gdpr)
requires maintaining a written record of processing activities available to
supervisory authorities on request. The evidence package is the primary
mechanism for satisfying all three provisions when controls are tested
by automated means.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Attaching full CI logs instead of excerpts | High noise, low signal; auditors reject | Bound log excerpts to the test window (Step 3) |
| No control-ID mapping | Auditor cannot match evidence to controls | Build control-map.yaml before collecting (Step 1) |
| Evidence in mutable storage | Tampering risk; custody note hash breaks | Use immutable store or append-only artifact (Step 6) |
| Evidence package without README | Auditor lacks engagement context | Always include README.txt with dates, scope, contacts (Step 6) |
| Manual collection only | Does not scale for Type II observation periods | Automate in CI with nightly schedule (Step 8) |
| Generating evidence for every control manually | Misses the point of test automation | Map controls to existing tests first (Step 1) |

## Limitations

- This is a build-an-X workflow. The control-map file and assembler script
  must be authored per engagement; there is no universal control catalog
  that maps to all frameworks without customization.
- NIST IR 8011 Vol 1 (csrc.nist.gov/publications/detail/nistir/8011/vol-1/final)
  defines automated assessment using "testable defect checks" against SP
  800-53 determination statements. This skill follows the same pattern
  (desired state vs. actual state from test results) but does not implement
  NIST IR 8011's full sub-capability taxonomy.
- GRC platform ingestion formats vary and change; verify the target
  platform's current upload requirements at the time of the engagement.
- Some controls (e.g., physical access, vendor risk) cannot be tested
  automatically; those require manual attestation and are out of scope here.
- AICPA Trust Services Criteria (2017 with 2022 revised points of focus)
  are behind a registration wall at aicpa-cima.com - cited by stable
  document title per authoring guidance; readers should access via AICPA
  account.

## References

- csrc.nist.gov/glossary/term/chain_of_custody - NIST SP 800-72 chain-of-custody definition (fetched 2026-06-04)
- isaca.org/resources/glossary - ISACA "artifact" and "audit evidence" definitions (fetched 2026-06-04)
- csrc.nist.gov/publications/detail/nistir/8011/vol-1/final - NIST IR 8011 Vol 1: automated assessment of SP 800-53 controls via testable defect checks (fetched 2026-06-04)
- gdpr-info.eu/art-5-gdpr, gdpr-info.eu/art-24-gdpr, gdpr-info.eu/art-30-gdpr - GDPR accountability obligations (fetched 2026-06-04)
- AICPA Trust Services Criteria 2017 (rev. 2022 points of focus) - available at aicpa-cima.com (paywalled; registration required)
- PCI DSS v4.0.1 Requirement 10 - 12-month retention requirement; source: pcisecuritystandards.org
- [`soc2-evidence-collector`](../soc2-evidence-collector/SKILL.md) - SOC 2-specific raw log collection
- [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md) - authoring tamper-evident audit log tests
