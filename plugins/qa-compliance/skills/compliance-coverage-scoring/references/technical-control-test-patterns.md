# Technical-control test patterns (ISO/IEC 27001:2022 Annex A)

Deep reference behind [iso27001.md](iso27001.md). The complete per-control
test-pattern catalog for the A.8.x (plus two A.5/A.6) controls verifiable
through automated tests. Consult when authoring the actual test for a control;
iso27001.md keeps the summary table and one fully worked example (A.8.5).

All control IDs and names are sourced from
[isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/)
(fetched 2026-06-04). Test templates use the team's existing frameworks; the API
names (e.g. `kms.describe_key`, `siem.get_alerts`) must be adapted to the target
stack. A.5, A.6, and A.7 controls are otherwise verified through document review
and site inspection; automated tests exist only where the control has a runtime
behavior.

### A.8.2 - Privileged Access Rights

Privileged accounts must be separately provisioned, minimally scoped, and
reviewed.

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

The end-to-end narrated version of this control is the Worked example in
SKILL.md; the terse catalog form is below.

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

The secure-development cluster covers: Secure Development Life Cycle (A.8.25),
Application Security Requirements (A.8.26), Secure System Architecture (A.8.27),
Secure Coding (A.8.28, new in 2022), Security Testing in Development and
Acceptance (A.8.29), Outsourced Development (A.8.30), and Separation of
Environments (A.8.31).

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

## Source

- [isms.online/iso-27001/annex-a](https://www.isms.online/iso-27001/annex-a/) -
  community Annex A reference (control IDs, names; fetched 2026-06-04)
