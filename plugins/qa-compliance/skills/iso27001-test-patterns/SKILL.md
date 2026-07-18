---
name: iso27001-test-patterns
description: "Reference catalog of ISO/IEC 27001:2022 Annex A test patterns - per-control-theme coverage across 93 controls in four themes (organizational A.5, people A.6, physical A.7, technological A.8); testable technical controls with code-level assertions for access control (A.8.2-A.8.5), logging and monitoring (A.8.15-A.8.16), cryptography (A.8.24), and secure development (A.8.25-A.8.31); evidence patterns for Stage 1 and Stage 2 certification audits; Statement of Applicability scoping. Use when authoring ISMS test coverage for an ISO 27001:2022 certification engagement or gap assessment."
---

# iso27001-test-patterns

## Overview

Per [isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/) (community
reference; canonical standard text at iso.org/standard/27001 - paywalled;
cite by stable ID "ISO/IEC 27001:2022"):

ISO/IEC 27001:2022 restructured Annex A from 114 controls (2013 edition)
to **93 controls across four themes**, adding 11 new controls for cloud,
threat intelligence, secure coding, and monitoring. The four themes are:

| Theme | Controls | Count |
|---|---|---|
| A.5 Organizational | A.5.1 - A.5.37 | 37 |
| A.6 People | A.6.1 - A.6.8 | 8 |
| A.7 Physical | A.7.1 - A.7.14 | 14 |
| A.8 Technological | A.8.1 - A.8.34 | 34 |

**Note on the standard text:** ISO/IEC 27001:2022 is paywalled at
iso.org. Per PLUGIN_AUTHORING Step 4 (Cloudflare Turnstile fallback):
cite by stable ID "ISO/IEC 27001:2022" and let readers navigate
manually. All control IDs, names, and counts in this skill are sourced
from isms.online/iso-27001/annex-a/ (fetched 2026-06-04).

This is a **pure-reference skill** - defines the test-pattern catalog
by control. Tests use the team's existing test framework; this skill
is the per-control test recipe.

## When to use

- Preparing for ISO 27001:2022 Stage 1 (documentation) or Stage 2
  (implementation evidence) certification audit.
- Scoping a Statement of Applicability (SoA) - deciding which of the
  93 Annex A controls apply and what tests demonstrate their operation.
- Gap assessment: identifying which technical controls have no test
  coverage.
- New feature touches identity, access, cryptography, or secure
  development - confirming the relevant A.8.x controls are still
  covered.

## Annex A control index

### A.5 Organizational controls (37 controls)

Per [isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/)
(fetched 2026-06-04). Most A.5 controls are verified by document review,
policy attestation, or access-control test. The exceptions with automated
test patterns are A.5.3 (segregation of duties) and A.5.34 (PII
protection) - both covered in the test-patterns section below.

| ID | Control name |
|---|---|
| A.5.1 | Policies for Information Security |
| A.5.2 | Information Security Roles and Responsibilities |
| A.5.3 | Segregation of Duties |
| A.5.4 | Management Responsibilities |
| A.5.5 | Contact With Authorities |
| A.5.6 | Contact With Special Interest Groups |
| A.5.7 | Threat Intelligence (NEW 2022) |
| A.5.8 | Information Security in Project Management |
| A.5.9 | Inventory of Information and Other Associated Assets |
| A.5.10 | Acceptable Use of Information and Other Associated Assets |
| A.5.11 | Return of Assets |
| A.5.12 | Classification of Information |
| A.5.13 | Labelling of Information |
| A.5.14 | Information Transfer |
| A.5.15 | Access Control |
| A.5.16 | Identity Management |
| A.5.17 | Authentication Information |
| A.5.18 | Access Rights |
| A.5.19 | Information Security in Supplier Relationships |
| A.5.20 | Addressing Information Security Within Supplier Agreements |
| A.5.21 | Managing Information Security in the ICT Supply Chain |
| A.5.22 | Monitoring, Review and Change Management of Supplier Services |
| A.5.23 | Information Security for Use of Cloud Services (NEW 2022) |
| A.5.24 | Information Security Incident Management Planning and Preparation |
| A.5.25 | Assessment and Decision on Information Security Events |
| A.5.26 | Response to Information Security Incidents |
| A.5.27 | Learning From Information Security Incidents |
| A.5.28 | Collection of Evidence |
| A.5.29 | Information Security During Disruption |
| A.5.30 | ICT Readiness for Business Continuity (NEW 2022) |
| A.5.31 | Legal, Statutory, Regulatory and Contractual Requirements |
| A.5.32 | Intellectual Property Rights |
| A.5.33 | Protection of Records |
| A.5.34 | Privacy and Protection of PII |
| A.5.35 | Independent Review of Information Security |
| A.5.36 | Compliance With Policies, Rules and Standards for Information Security |
| A.5.37 | Documented Operating Procedures |

### A.6 People controls (8 controls)

A.6 controls are verified by HR records, contract review, training
completion records, and offboarding audits. A.6.8 (Information Security
Event Reporting) has an automated test pattern - see below.

| ID | Control name |
|---|---|
| A.6.1 | Screening |
| A.6.2 | Terms and Conditions of Employment |
| A.6.3 | Information Security Awareness, Education and Training |
| A.6.4 | Disciplinary Process |
| A.6.5 | Responsibilities After Termination or Change of Employment |
| A.6.6 | Confidentiality or Non-Disclosure Agreements |
| A.6.7 | Remote Working |
| A.6.8 | Information Security Event Reporting |

### A.7 Physical controls (14 controls)

A.7 controls are verified by site inspection, physical access-log
review, and equipment maintenance records. No automated code-level
test patterns exist for A.7; evidence is operational.

| ID | Control name |
|---|---|
| A.7.1 | Physical Security Perimeters |
| A.7.2 | Physical Entry |
| A.7.3 | Securing Offices, Rooms and Facilities |
| A.7.4 | Physical Security Monitoring (NEW 2022) |
| A.7.5 | Protecting Against Physical and Environmental Threats |
| A.7.6 | Working In Secure Areas |
| A.7.7 | Clear Desk and Clear Screen |
| A.7.8 | Equipment Siting and Protection |
| A.7.9 | Security of Assets Off-Premises |
| A.7.10 | Storage Media |
| A.7.11 | Supporting Utilities |
| A.7.12 | Cabling Security |
| A.7.13 | Equipment Maintenance |
| A.7.14 | Secure Disposal or Re-Use of Equipment |

### A.8 Technological controls (34 controls)

Per [isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/)
(fetched 2026-06-04). NEW = added in the 2022 revision.

A.8.1 User Endpoint Devices / A.8.2 Privileged Access Rights /
A.8.3 Information Access Restriction / A.8.4 Access to Source Code /
A.8.5 Secure Authentication / A.8.6 Capacity Management /
A.8.7 Protection Against Malware / A.8.8 Management of Technical
Vulnerabilities / **A.8.9 Configuration Management (NEW)** /
**A.8.10 Information Deletion (NEW)** / **A.8.11 Data Masking (NEW)** /
**A.8.12 Data Leakage Prevention (NEW)** / A.8.13 Information Backup /
A.8.14 Redundancy of Information Processing Facilities /
A.8.15 Logging / **A.8.16 Monitoring Activities (NEW)** /
A.8.17 Clock Synchronization / A.8.18 Use of Privileged Utility
Programs / A.8.19 Installation of Software on Operational Systems /
A.8.20 Networks Security / A.8.21 Security of Network Services /
A.8.22 Segregation of Networks / **A.8.23 Web Filtering (NEW)** /
A.8.24 Use of Cryptography / A.8.25 Secure Development Life Cycle /
A.8.26 Application Security Requirements / A.8.27 Secure System
Architecture and Engineering Principles /
**A.8.28 Secure Coding (NEW)** /
A.8.29 Security Testing in Development and Acceptance /
A.8.30 Outsourced Development /
A.8.31 Separation of Development, Test and Production Environments /
A.8.32 Change Management / A.8.33 Test Information /
A.8.34 Protection of Information Systems During Audit Testing

## Test patterns by technical control

The patterns below cover the A.8.x controls that are verifiable
through automated tests. A.5, A.6, and A.7 are primarily verified
through document review and site inspection (noted in the tables
above as "Document review", "Attestation", etc.); automated tests
exist where the control has a runtime behavior.

### A.8.2 - Privileged Access Rights

Privileged accounts must be separately provisioned, minimally scoped,
and reviewed. Per [isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/)
(fetched 2026-06-04):

```python
def test_privileged_accounts_are_separate_identities():
    """A.8.2: privileged access uses dedicated accounts, not shared admin."""
    admin_accounts = iam.list_accounts(role='admin')
    regular_accounts = iam.list_accounts(role='user')
    # No account should appear in both sets:
    overlap = set(admin_accounts) & set(regular_accounts)
    assert overlap == set(), f"Shared admin/user identities: {overlap}"

def test_privileged_access_reviewed_within_period():
    """A.8.2: quarterly access review must be on record."""
    last_review = AccessReview.objects.filter(scope='privileged').order_by('-completed_at').first()
    assert last_review is not None
    assert (timezone.now() - last_review.completed_at).days <= 90
```

### A.8.3 - Information Access Restriction

```python
def test_user_cannot_access_data_outside_their_classification():
    """A.8.3: access restriction enforced per data classification."""
    user = User.objects.get(clearance='internal')
    response = client_for(user).get('/data/confidential/records')
    assert response.status_code == 403

def test_role_change_revokes_prior_access_immediately():
    """A.8.3 + A.5.18: reclassification of role removes prior grants."""
    user = grant_role(user, 'analyst')
    revoke_role(user, 'analyst')
    response = client_for(user).get('/reports/analyst-only')
    assert response.status_code == 403
```

### A.8.4 - Access to Source Code

```python
def test_only_developers_have_write_access_to_source():
    """A.8.4: source code write permissions restricted to dev group."""
    non_dev_users = User.objects.exclude(groups__name='developers')
    for user in non_dev_users[:10]:   # sample
        assert not scm.has_write_access(user, repo='main-app'), \
            f"{user.email} has unexpected write access"
```

### A.8.5 - Secure Authentication

```python
def test_mfa_enforced_for_all_users():
    """A.8.5: MFA required; login without second factor must fail."""
    response = client.post('/auth/login', json={
        'email': 'alice@example.com',
        'password': 'correct-password',
        # no OTP supplied
    })
    # Must not issue session token without second factor:
    assert response.status_code in [401, 403]
    assert 'session_token' not in response.json()

def test_password_complexity_policy_enforced():
    """A.8.5: weak passwords rejected at registration."""
    response = client.post('/auth/register', json={
        'email': 'bob@example.com',
        'password': 'password123',   # weak
    })
    assert response.status_code == 400
    assert 'password' in response.json().get('errors', {})
```

### A.8.15 - Logging

```python
def test_authentication_events_produce_audit_records():
    """A.8.15: login success and failure must be logged."""
    with capture_audit_log() as logs:
        client.post('/auth/login', json={'email': 'alice@example.com', 'password': 'wrong'})
    events = [e for e in logs if e['event_type'] == 'auth.login.failure']
    assert len(events) >= 1
    record = events[0]
    # Required fields per A.8.15:
    assert 'timestamp' in record
    assert 'user_identifier' in record
    assert 'source_ip' in record
    assert 'outcome' in record

def test_audit_log_is_append_only():
    """A.8.15: log records must not be deletable via application API."""
    log_id = AuditLog.objects.last().id
    response = client.delete(f'/audit-logs/{log_id}')
    # No DELETE endpoint should exist; log must survive:
    assert response.status_code in [404, 405]
    assert AuditLog.objects.filter(id=log_id).exists()
```

### A.8.16 - Monitoring Activities (new in 2022)

```python
def test_anomaly_detection_alert_fires_on_excessive_failures():
    """A.8.16: sustained login failures must trigger a monitoring alert."""
    for _ in range(20):
        client.post('/auth/login', json={'email': 'alice@example.com', 'password': 'wrong'})
    # SIEM / monitoring platform must have received the alert:
    alerts = siem.get_alerts(rule='excessive_login_failures', within_minutes=5)
    assert len(alerts) >= 1

def test_privileged_action_monitored_in_realtime():
    """A.8.16: privileged admin operations must appear in monitoring stream."""
    with monitor_events() as stream:
        admin_client.post('/admin/users/bulk-export')
    assert any(e['category'] == 'privileged_operation' for e in stream.events)
```

### A.8.17 - Clock Synchronization

```python
def test_audit_log_timestamps_within_ntp_tolerance():
    """A.8.17: log timestamps must be within NTP drift tolerance (typically 1 s)."""
    ntp_time = get_ntp_time()
    for record in AuditLog.objects.order_by('-created_at')[:50]:
        drift = abs((record.created_at - ntp_time).total_seconds())
        assert drift < 1.0, f"Log timestamp drift {drift}s exceeds 1 s NTP tolerance"
```

### A.8.24 - Use of Cryptography

```python
def test_data_at_rest_encrypted_with_approved_algorithm():
    """A.8.24: storage encryption must use AES-256 or equivalent."""
    config = kms.describe_key(key_id='data-encryption-key')
    assert config['KeySpec'] in ['AES_256', 'SYMMETRIC_DEFAULT']
    assert config['KeyState'] == 'Enabled'

def test_tls_minimum_version_enforced():
    """A.8.24: TLS 1.2 is the minimum acceptable; TLS 1.0/1.1 must be rejected."""
    for old_version in ['TLSv1', 'TLSv1.1']:
        connection = attempt_tls_connection(host='api.example.com', version=old_version)
        assert connection.failed, f"TLS {old_version} should be rejected but was accepted"

def test_encryption_key_rotation_on_schedule():
    """A.8.24: key rotation must occur within policy window (e.g., 365 days)."""
    key_meta = kms.get_key_rotation_status('data-encryption-key')
    assert key_meta['KeyRotationEnabled'] is True
    last_rotation = key_meta['LastRotatedDate']
    days_since = (datetime.utcnow() - last_rotation).days
    assert days_since <= 365, f"Key last rotated {days_since} days ago; exceeds 365-day policy"
```

### A.8.25 - A.8.31 Secure development controls

Per [isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/)
(fetched 2026-06-04), the secure-development cluster covers: Secure
Development Life Cycle (A.8.25), Application Security Requirements
(A.8.26), Secure System Architecture (A.8.27), Secure Coding (A.8.28,
new in 2022), Security Testing in Development and Acceptance (A.8.29),
Outsourced Development (A.8.30), and Separation of Environments
(A.8.31).

```python
def test_security_testing_required_before_production_deployment():
    """A.8.29: release pipeline must gate on security test pass."""
    pipeline = ci.get_last_pipeline(branch='main')
    stages = [s['name'] for s in pipeline['stages']]
    assert 'security-scan' in stages, "Security scan stage missing from pipeline"
    security_stage = next(s for s in pipeline['stages'] if s['name'] == 'security-scan')
    assert security_stage['status'] == 'passed'

def test_production_and_dev_environments_share_no_credentials():
    """A.8.31: dev/test must not use production secrets."""
    prod_db_url = secrets.get('DATABASE_URL', env='production')
    dev_db_url = secrets.get('DATABASE_URL', env='development')
    assert prod_db_url != dev_db_url, "Production and development share a database credential"

def test_sast_scan_in_pr_pipeline():
    """A.8.28: static analysis for secure coding must run on every PR."""
    last_prs = scm.list_merged_prs(count=20)
    for pr in last_prs:
        checks = scm.get_check_runs(pr['head_sha'])
        sast_checks = [c for c in checks if 'sast' in c['name'].lower() or 'semgrep' in c['name'].lower()]
        assert len(sast_checks) > 0, f"PR #{pr['number']} merged without SAST check"
        assert all(c['conclusion'] == 'success' for c in sast_checks), \
            f"PR #{pr['number']} merged with SAST failures"
```

### A.5.3 - Segregation of Duties

A.5.3 is organizational but has a testable runtime assertion:

```python
def test_same_user_cannot_approve_their_own_change():
    """A.5.3: the author of a change must not be its sole approver."""
    prs = scm.list_merged_prs(count=50)
    for pr in prs:
        author = pr['author']
        approvers = [r['user'] for r in pr['reviews'] if r['state'] == 'APPROVED']
        # Author approval alone must not satisfy the merge gate:
        non_author_approvals = [a for a in approvers if a != author]
        assert len(non_author_approvals) >= 1, \
            f"PR #{pr['number']} approved only by its author ({author})"
```

### A.5.34 / A.6.8 - PII protection and incident reporting

```python
def test_pii_fields_not_exposed_in_api_responses():
    """A.5.34: PII must not leak via standard API responses."""
    response = client.get('/api/users')
    users = response.json()['results']
    for user in users:
        assert 'password' not in user
        assert 'ssn' not in user
        assert 'tax_id' not in user

def test_security_event_report_creates_ticket():
    """A.6.8: employee-reported security events must generate a trackable record."""
    response = employee_client.post('/security/report-event', json={
        'description': 'Suspicious email with attachment',
        'severity': 'medium',
    })
    assert response.status_code == 201
    ticket_id = response.json()['ticket_id']
    assert IncidentTicket.objects.filter(id=ticket_id).exists()
```

## Evidence patterns for certification audits

Per [isms.online/iso-27001/](https://www.isms.online/iso-27001/)
(fetched 2026-06-04), certification follows two stages:

**Stage 1 audit:** Documentation review. Auditor reads the ISMS,
policies, risk assessment, and Statement of Applicability. Evidence
needed: policy documents, risk register, SoA with justifications.

**Stage 2 audit:** Implementation verification. Auditor samples
control operation. Evidence needed: test pass-history, access-review
records, audit logs, deployment pipeline outputs, training records.

| Control cluster | Evidence type | Collector pattern |
|---|---|---|
| A.5.15, A.8.2, A.8.3 | IDP audit logs (access grants, reviews) | Daily export from Okta/Auth0/Entra |
| A.8.5 | MFA enforcement logs | Per-login event stream |
| A.8.15, A.8.16 | SIEM event history | Continuous alert feed (append-only) |
| A.8.24 | KMS key configuration + rotation history | Quarterly attestation export |
| A.8.25 - A.8.31 | CI pipeline pass-history (SAST, security tests) | Per-PR run history |
| A.5.18, A.6.5 | Provisioning/deprovisioning tickets | ITSM export per hire/departure |
| A.6.3 | Training completion records | LMS export |
| A.5.26, A.5.27 | Incident post-mortem records | Incident management system export |

Evidence storage requirements: append-only, immutable (S3 versioning
or equivalent), with collector-run metadata so auditors can verify
continuity.

## Statement of Applicability (SoA)

Per [isms.online/iso-27001/statement-of-applicability](https://www.isms.online/iso-27001/statement-of-applicability/)
(fetched 2026-06-04):

The SoA is a mandatory document under ISO/IEC 27001:2022 clause 6.1.3.
It must list all 93 Annex A controls and for each declare:

- Implementation status (implemented / not implemented)
- Justification for inclusion or exclusion
- Brief description of how the control is implemented, with policy reference

A control marked "not applicable" must include:

1. Which specific control (ID + name, not "general")
2. Reason the control does not apply to the organization
3. Approver (CISO / DPO / compliance officer)
4. Re-review date

The not-applicable verdict logic refuses to accept scope exclusions
without all four required fields.

## Key compliance gaps tests should catch

| Gap | Detection |
|---|---|
| MFA bypassed on legacy endpoints | A.8.5 per-endpoint test |
| Audit logs deletable via API | A.8.15 append-only assertion |
| Dev pipeline merges without SAST | A.8.28 PR check audit |
| Prod and dev share a database credential | A.8.31 credential isolation test |
| Access rights not reviewed within 90 days | A.8.2 review-recency assertion |
| Same engineer authors and approves a change | A.5.3 PR approval test |
| Log timestamps drift from NTP by more than 1 s | A.8.17 clock-sync test |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| SoA excludes a control with no justification | Stage 1 audit rejects SoA; certification blocked | Document reason + approver + re-review date per clause 6.1.3 |
| Tests run only in CI against dev data | Auditor cannot verify production control operation | Run periodic evidence-collection in production equivalents |
| Audit log evidence stored in mutable storage | Auditor disputes log integrity | Append-only immutable storage (S3 versioning or equivalent) |
| Map one SAST scan to all A.8.25-A.8.31 controls | Each control needs its own dedicated assertion | Per-control test (A.8.29 gates pipeline; A.8.31 tests env isolation separately) |
| Skip clock-sync test (A.8.17) | Log correlation fails during incident forensics | NTP-drift assertion (A.8.17 pattern above) |

## Limitations

- This skill is a test-pattern catalog, not legal advice and not a
  substitute for a qualified ISO 27001 lead auditor.
- The standard text (ISO/IEC 27001:2022) is paywalled at iso.org;
  this skill sources control IDs, names, and counts from
  isms.online/iso-27001/annex-a/ (fetched 2026-06-04).
- Controls A.5, A.6, and A.7 are largely verified by document review
  and site inspection; automated test patterns are only listed where
  a runtime behavior exists.
- ISO/IEC 27001:2022 clause numbering differs from the 2013 edition;
  verify the edition in scope for any active engagement.
- Test templates above use the team's existing frameworks; actual
  API names (e.g., `kms.describe_key`, `siem.get_alerts`) must be
  adapted to the target stack.

## References

- [isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/) -
  community Annex A reference (control IDs, names, count; source for
  this skill; fetched 2026-06-04)
- [isms.online/iso-27001/statement-of-applicability](https://www.isms.online/iso-27001/statement-of-applicability/) -
  SoA requirements (fetched 2026-06-04)
- [isms.online/iso-27001/](https://www.isms.online/iso-27001/) -
  ISMS requirements (clauses 4-10) and certification stages
  (fetched 2026-06-04)
- iso.org/standard/27001 - canonical ISO/IEC 27001:2022 standard text
  (paywalled; cite by stable ID "ISO/IEC 27001:2022")
- [`soc2-evidence-collector`](../soc2-evidence-collector/SKILL.md) -
  sister: SOC 2 Type II evidence collection (AICPA TSC)
- [`gdpr-test-patterns`](../gdpr-test-patterns/SKILL.md) -
  sister: GDPR per-Article test catalog
- [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md) -
  companion: audit log emission tests (feeds A.8.15 evidence)
