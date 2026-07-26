---
name: soc2-evidence-collector
description: "Build-an-X for SOC 2 Type II evidence collection - per-Trust-Services-Criterion test artifacts (Common Criteria CC1.1 - CC9.2; plus Availability A1, Confidentiality C1, Processing Integrity PI1, Privacy P1 - P9 if in scope); auto-collection from CI logs + audit trails + access logs + change-management records; alignment with Vanta / Drata / Secureframe evidence shapes; observation-period sampling. Use when the team is preparing for SOC 2 Type II audit and needs continuous evidence collection automation."
---

# soc2-evidence-collector

## Overview

Scope decision - which Trust Services Criteria (TSC) this collector must cover:

| Category | TSC sections | Required? |
|---|---|---|
| Common Criteria | CC1 - CC9 (35 sub-criteria) | Always required |
| Availability | A1 | Optional (recommended for SaaS uptime claims) |
| Confidentiality | C1 | Optional (typical for B2B SaaS) |
| Processing Integrity | PI1 | Optional (common for transaction-processing SaaS) |
| Privacy | P1 - P9 | Optional (common when handling PII at scale) |

Type II is assessed over a 3 - 12 month observation period, so every in-scope
control needs continuous evidence available for auditor sampling, not a
point-in-time snapshot.

This is a **build-an-X workflow** - the per-criterion evidence
collection script, not a standalone tool. Pair with Vanta / Drata /
Secureframe (commercial GRC platforms) for evidence storage +
auditor-facing dashboards.

## When to use

- Pre-audit: Type II observation period started; need continuous
  evidence.
- Pre-pre-audit: identifying which controls + evidence are
  testable vs require manual attestation.
- Post-finding remediation: a previous audit flagged an evidence
  gap.
- Adopting a GRC platform (Vanta/Drata/Secureframe) and need
  evidence-feed configuration.

## Step 1 - Identify in-scope criteria

Most SaaS engagements include CC + Availability + Confidentiality.
Privacy criteria add when GDPR/CCPA also in scope. Processing
Integrity adds for fintech / data-processing SaaS. The full
per-criterion scope-decision table is in
[references/evidence-source-map.md](references/evidence-source-map.md).

## Step 2 - Auto-collect evidence per criterion

Map each control to one or more automatable evidence sources; the
full control-to-evidence-source table is in
[references/evidence-source-map.md](references/evidence-source-map.md).

`okta_client`, `aws_iam`, `github_org`, and `slack` in the examples are
injected client interfaces - thin wrappers you provide over the vendor SDKs
(okta-sdk-python, boto3, PyGithub, slack_sdk), not pip-importable modules.

Example collector script:

```python
# evidence/cc6_1_logical_access.py
import okta_client, datetime, json

def collect_cc6_1_evidence(start_date, end_date):
    """Per CC6.1: collect user-access audit events for the period."""
    events = okta_client.get_audit_events(
        type='user.session.start',
        start_date=start_date,
        end_date=end_date,
    )
    evidence = {
        'control_id': 'CC6.1',
        'period_start': start_date.isoformat(),
        'period_end': end_date.isoformat(),
        'evidence_type': 'user_access_logs',
        'sample_size': len(events),
        'events': events[:100],   # auditor sample
        'collected_at': datetime.datetime.utcnow().isoformat(),
        'collector': 'soc2-evidence-collector v1.0',
    }
    with open(f'evidence/cc6_1_{start_date.date()}_{end_date.date()}.json', 'w') as f:
        json.dump(evidence, f, indent=2)
```

## Step 3 - Per-control test patterns

Beyond raw evidence collection, write tests that verify the control
operates correctly:

```python
def test_cc6_3_offboarded_user_has_no_active_sessions():
    """CC6.3: deprovisioned users must lose all access immediately."""
    user = User.objects.get(email='alice@example.com')
    deprovision(user)

    # Verify across all systems:
    assert not okta_client.user_has_active_sessions(user)
    assert not aws_iam.user_exists(user.aws_username)
    assert not github_org.is_member(user)
    assert not slack.is_member(user)
    # Audit log records the deprovisioning event:
    assert AuditLog.objects.filter(
        actor='hr-system',
        action='deprovision',
        subject=user.email,
    ).exists()
```

These tests run in CI; their pass/fail history is itself evidence
for the auditor.

## Step 4 - GRC platform alignment

**Default: Vanta** - the broadest native-integration coverage (AWS / Okta / GitHub / GSuite / etc.) means the auto-collected evidence (Step 2) only needs to fill gaps the integrations don't cover. Use the alternatives when Vanta doesn't fit:

| Platform | Use when |
|---|---|
| Vanta (default) | Standard SaaS stack with mainstream identity / cloud / source-control providers |
| Drata | Multi-framework engagement (SOC 2 + ISO 27001 + HIPAA) where Drata's templates lead |
| Secureframe | Budget-constrained engagement where Vanta's pricing is prohibitive |

Across all three, evidence ingest format is platform-specific but the auto-collected JSON (Step 2) feeds the platform's manual-upload UI when no native integration exists for your tooling.

## Step 5 - Observation period sampling

Type II auditors typically request:

- Population list (all instances of a control event during the
  period - e.g., all PRs merged, all access-grants)
- Sample (auditor selects 25 - 40 random instances)
- Per-sample evidence (the specific logs, tickets, approvals)

Your evidence collector should support both:
- Population queries (`SELECT * FROM audit_log WHERE date BETWEEN ...`)
- Per-instance evidence retrieval (full context for one event)

## Step 6 - Continuous-monitoring controls

Some controls are continuous (e.g., CC7.1 threat detection) - the
evidence is an alert-history feed, not point-in-time samples.

Pattern: daily collector cron job that:
1. Queries the source system for the previous day's events
2. Stores in append-only evidence storage (S3 with versioning,
   immutable)
3. Records collector-run metadata (when, what, how many records)

Continuity gaps in collector runs are themselves audit findings - 
make collector failures alert-worthy.

## Step 7 - End-to-end recipe

For each in-scope criterion:

1. ✅ Map criterion to evidence source(s)
2. ✅ Implement automated collector (Step 2)
3. ✅ Write per-control test (Step 3)
4. ✅ Wire evidence into GRC platform (Step 4)
5. ✅ Verify continuous-collection has no gaps (Step 6)
6. ✅ Run a mock auditor query (request a sample; verify response is complete + timely)

## Worked example

The observation period opens and CC6.3 (access deprovisioning) is in scope. The collector exports offboarding tickets daily; the per-control test `test_cc6_3_offboarded_user_has_no_active_sessions` runs in CI. A mock auditor sample pulls one departed employee: the ticket and the Okta session-revoke event line up, but the test fails because the ex-employee is still an org member in `github_org`. GitHub was never wired into the deprovisioning job. The team adds it, the test goes green, and the passing run plus the daily offboarding export becomes the CC6.3 evidence the auditor samples.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Manual evidence collection only | Doesn't scale across observation period; misses sampling intervals | Automated collector (Step 2) |
| Trust the auditor will only sample what we expect | Audit fails on unexpected sample request | Continuous full-population collection (Step 6) |
| Evidence stored in mutable storage | Tampering risk; audit invalidated | Append-only / immutable storage (Step 6) |
| Test pass-history not preserved | Loses control-effectiveness evidence | Persist test results for the period |
| Skip mock-audit dry runs | First real audit reveals gaps | Mock-audit before observation period (Step 7) |

## Limitations

- This is a build-an-X workflow. Tests use the team's existing
  test framework + cloud APIs.
- SOC 2 has many criteria; this skill is a starting framework, not
  a complete control library.
- Trust Services Criteria evolve (current TSP 2017, revised 2022);
  pin version per audit engagement.
- GRC platforms are commercial; OSS alternatives (e.g.,
  comply-soc2 / Drata-compatible scripts) exist but are
  less polished.
- This skill doesn't replace a SOC 2 readiness consultant.

## References

- aicpa.org/topic/audit-assurance/audit-and-assurance-greaterthan-suitable-trust-services-criteria - AICPA Trust Services Criteria (paywalled; free abstract)
- vanta.com/solutions/soc-2 - Vanta SOC 2 product
- drata.com/grc-central/soc-2 - Drata SOC 2 reference
- secureframe.com/hub/soc-2 - Secureframe SOC 2 hub
- `gdpr-test-patterns`,
  `hipaa-test-patterns`,
  `audit-trail-test-author` - 
  sister test-pattern catalogs
