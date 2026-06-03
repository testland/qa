---
name: audit-trail-test-author
description: "Build-an-X for audit-log tests across compliance frameworks - required-events catalog (auth events / privilege change / data access / admin action / config change / export / impersonation); structured-log-format assertions per OWASP A09:2021; tamper-evident chain (hash-chain + signed-batch patterns) for HIPAA §164.312(b) + PCI Req 10 + SOC 2 CC7.3; immutability + retention per framework; query-replay tests for forensic reconstruction. Use when authoring audit log tests for any compliance framework (HIPAA / PCI / SOC 2 / GDPR / etc.)."
rating: 23
d6: 4
---

# audit-trail-test-author

## Overview

Audit logs are the universal compliance-evidence artifact. Every
major framework requires them, with overlapping but framework-specific
requirements:

| Framework | Audit log requirement |
|---|---|
| HIPAA Security Rule §164.312(b) | "implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use ePHI" |
| PCI DSS v4.0 Req 10 | Audit trails for all access to system components, plus log review + retention |
| SOC 2 CC7.3 | Detection of security events + logging |
| GDPR Art. 5(1)(f) + Art. 32 | Integrity + confidentiality of personal data; audit log is the standard evidence |
| ISO 27001 A.8.15 | Logging |
| NIST 800-53 AU family | Audit + accountability controls |

This is a **build-an-X workflow** - the per-system audit-log
test recipe. Different from a generic logging skill; specifically
focused on compliance-grade audit trails (tamper-evidence, retention,
required events).

## When to use

- Compliance framework requires audit logging.
- Authoring tests for a new feature that handles regulated data.
- Audit findings flagged audit-log gaps in a previous review.
- New service/component must be onboarded to org-wide audit
  pipeline.

## Step 1 - Required-events catalog

Universal events (required by most compliance frameworks):

| Event class | Examples |
|---|---|
| Authentication | Login success / failure / lockout / session expiry / MFA challenge |
| Authorization | Permission grant / revoke / failed-access-attempt / role change |
| Data access | Read PHI / PII / payment data; query that returns regulated data |
| Data modification | Create / update / delete of regulated records (with before/after) |
| Admin action | Config change / user provision / deprovision / privilege escalation |
| System events | Service start / stop / crash / restart / config-reload |
| Export / disclosure | Bulk download / API export / cross-org sharing |
| Impersonation / escalation | "Sign in as" / sudo / break-glass access |
| Failed actions | Anything in the above categories that errored / was denied |

Per-framework additions:

- **HIPAA**: emergency-access invocation
- **PCI**: PAN access (must NOT contain the PAN itself)
- **SOC 2**: change-management events
- **GDPR**: data-subject-rights workflow events (SAR, erasure)

## Step 2 - Structured log format

Per OWASP A09:2021 (Security Logging + Monitoring Failures), audit
logs MUST be structured (JSON) - NOT free-text. Schema:

```json
{
  "event_id": "audit-2026-05-06T12:00:00Z-abc123",
  "timestamp": "2026-05-06T12:00:00.123Z",
  "event_type": "phi_access",
  "actor": {
    "user_id": "alice@example.com",
    "session_id": "sess-xyz",
    "ip_address": "203.0.113.42",
    "user_agent": "Mozilla/5.0..."
  },
  "subject": {
    "type": "patient_record",
    "id": "patient:123",
    "phi_type": "clinical_notes"
  },
  "action": "read",
  "outcome": "success",
  "context": {
    "request_id": "req-abc",
    "service": "ehr-api",
    "version": "1.2.3"
  },
  "previous_event_hash": "sha256:abc...",
  "this_event_hash": "sha256:def..."
}
```

**Test pattern:**

```python
def test_audit_log_structure_valid():
    user.access_phi(patient_id=123)
    audit = AuditLog.objects.latest('timestamp')
    # Required fields
    for field in ['event_id', 'timestamp', 'event_type', 'actor', 'subject', 'action', 'outcome']:
        assert field in audit.to_dict()
    # Actor structure
    for sub_field in ['user_id', 'session_id', 'ip_address', 'user_agent']:
        assert sub_field in audit.actor
    # Schema-validated
    assert validate_against_schema(audit, 'audit-event-v1.json-schema')
```

## Step 3 - Tamper-evident chain (hash-chain)

For HIPAA §164.312(b) / PCI Req 10 / SOC 2 CC7.3 integrity
requirements:

```python
def test_audit_log_hash_chain_integrity():
    """Each event references the previous event's hash; tampering breaks the chain."""
    events = AuditLog.objects.all().order_by('timestamp')
    for i in range(1, len(events)):
        previous = events[i - 1]
        current = events[i]
        # current event's previous_event_hash must equal previous event's hash
        assert current.previous_event_hash == previous.this_event_hash, \
            f"Hash chain broken at event {current.event_id}"
        # Each event's hash is reproducible from its content
        recomputed = sha256(current.canonical_serialization())
        assert current.this_event_hash == recomputed, \
            f"Event {current.event_id} hash mismatch (tampered?)"
```

For higher integrity (PCI / fintech), use signed-batch logs:

```python
def test_audit_batch_signed_by_kms():
    """Daily batches signed by KMS; tampering invalidates signature."""
    today_batch = AuditBatch.objects.get(date=today())
    # Verify signature against KMS public key
    assert kms.verify_signature(today_batch.content, today_batch.signature)
```

## Step 4 - Immutability + retention

Audit logs MUST be append-only + retention-enforced:

```python
def test_audit_log_append_only():
    """Old events must not be modifiable / deletable."""
    old = AuditLog.objects.first()
    # Database row-level: UPDATE on audit_log table fails for non-admin
    with pytest.raises(PermissionDenied):
        connection.cursor().execute(f"UPDATE audit_log SET action = 'X' WHERE id = {old.id}")
    with pytest.raises(PermissionDenied):
        connection.cursor().execute(f"DELETE FROM audit_log WHERE id = {old.id}")

def test_audit_log_retention_policy():
    """Logs older than retention period are archived, not deleted (PCI: 1 year online + 1 year archive minimum)."""
    expired = AuditLog.objects.filter(timestamp__lt=timezone.now() - timedelta(days=365)).first()
    if expired:
        # Should be in archive, not main store
        assert AuditArchive.objects.filter(event_id=expired.event_id).exists()
```

Retention requirements vary:

| Framework | Retention |
|---|---|
| PCI DSS Req 10.5.1 | 1 year minimum, last 3 months online |
| HIPAA §164.316(b)(2) | 6 years from creation or last effective date |
| SOC 2 | observation period + reasonable retention |
| GDPR | as long as needed for the documented purpose |
| ISO 27001 | per ISMS retention policy |

## Step 5 - PII redaction

For frameworks that require audit logs but forbid PII in logs (PCI:
no PAN; HIPAA: minimum-necessary):

```python
def test_pan_not_in_audit_logs():
    """PCI Req 3.4: PAN must not appear in audit logs."""
    user.access_card(card_id=123)
    audit_text = AuditLog.objects.latest('timestamp').full_event_text
    # No 13-19 digit sequences (typical PAN length)
    assert not re.search(r'\d{13,19}', audit_text)

def test_phi_redacted_in_audit():
    """HIPAA minimum-necessary: log access event but not PHI content."""
    user.access_patient_record(patient_id=123)
    audit = AuditLog.objects.latest('timestamp')
    # Should log: who, what (event type), when, on which subject
    assert 'patient:123' in audit.subject_id
    # Should NOT log: the actual clinical notes content
    assert 'diagnosis' not in audit.full_event_text
```

## Step 6 - Forensic reconstruction (query-replay)

Compliance frameworks require ability to reconstruct events for
investigation:

```python
def test_can_reconstruct_user_activity_in_window():
    """SOC 2 CC7.3: detect security events; allows post-incident reconstruction."""
    user_id = 'alice@example.com'
    start = timezone.now() - timedelta(days=7)
    end = timezone.now()

    activity = AuditLog.objects.filter(
        actor__user_id=user_id,
        timestamp__range=[start, end],
    )
    # Activity is queryable + complete (no gaps)
    assert activity.count() > 0
    timestamps = sorted([e.timestamp for e in activity])
    # No suspicious gaps (e.g., gaps > 1 hour during active session)
    for i in range(1, len(timestamps)):
        gap = (timestamps[i] - timestamps[i - 1]).total_seconds()
        # Annotate: this would be domain-specific; just ensure queryable
```

## Step 7 - Cross-system aggregation

Modern systems span microservices; per-service local audit logs
must aggregate to a central audit store:

```python
def test_audit_events_aggregated_centrally():
    """Distributed audit events MUST land in central store within SLA."""
    # Trigger an event in microservice A
    response = service_a.access_phi(patient_id=123)
    event_id = response.headers['X-Event-ID']

    # Within 30 seconds, central store should have it
    deadline = time.time() + 30
    while time.time() < deadline:
        if CentralAuditStore.objects.filter(event_id=event_id).exists():
            return
        time.sleep(1)
    pytest.fail(f"Event {event_id} not aggregated to central store within 30s")
```

## Step 8 - End-to-end test recipe

For each system handling regulated data:

1. ✅ Required events emitted (Step 1 catalog)
2. ✅ Structured format conforms to schema (Step 2)
3. ✅ Hash chain or signed-batch integrity (Step 3)
4. ✅ Append-only + retention enforced (Step 4)
5. ✅ Sensitive content redacted (Step 5)
6. ✅ Forensic-replay queries succeed (Step 6)
7. ✅ Distributed events aggregate centrally (Step 7)

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Free-text logs without structure | Can't reliably query for forensics | Structured JSON (Step 2) |
| No tamper-evidence | Logs modifiable post-incident; auditor rejects | Hash chain or signed batch (Step 3) |
| PAN/PII in logs | PCI/HIPAA violation in the audit logs themselves | Redaction (Step 5) |
| Audit logs writable by app | App compromise = audit log tampering | Append-only DB perms (Step 4) |
| Per-service local logs only | No cross-service incident reconstruction | Central aggregation (Step 7) |

## Limitations

- This is a build-an-X workflow. Tests use the team's existing
  test framework + DB / log-store APIs.
- Tamper-evidence is implementation-specific; hash-chain is one
  option; signed-batch + WORM storage another.
- Some frameworks (GDPR) require subject access to their own audit
  logs - adds a SAR-flow assertion that varies by interpretation.
- Distributed-system clock-skew can cause hash-chain disorder;
  use logical clocks (Lamport / vector) for ordering critical
  events.

## References

- owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures - OWASP Top 10 2021 audit logging
- nist.gov/publications/sp-800-92-guide-computer-security-log-management - NIST SP 800-92 log management guide
- [`hipaa-test-patterns`](../hipaa-test-patterns/SKILL.md) - §164.312(b)
- [`pci-dss-scope-checker`](../pci-dss-scope-checker/SKILL.md) - Req 10
- [`soc2-evidence-collector`](../soc2-evidence-collector/SKILL.md) - CC7.3
- [`gdpr-test-patterns`](../gdpr-test-patterns/SKILL.md) - Art. 5(1)(f)
- [`compliance-readiness-reviewer`](../../agents/compliance-readiness-reviewer.md) - agent
