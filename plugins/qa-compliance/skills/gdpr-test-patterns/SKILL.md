---
name: gdpr-test-patterns
description: "Reference catalog of GDPR-aligned test patterns — data-subject-rights workflows (Art. 15 access, Art. 16 rectification, Art. 17 erasure / \"right to be forgotten\", Art. 18 restriction, Art. 20 portability, Art. 21 objection); consent recording + revocation per Art. 7; data-residency assertions per Art. 44–50 international transfers; breach-notification timing tests per Art. 33 (72 hours); data-minimization assertions in fixtures per Art. 5(1)(c). Use when authoring GDPR-readiness tests for any product processing EU personal data."
rating: 22
d6: 4
archetype: S2
---

# gdpr-test-patterns

## Overview

Per [gdpr.eu][gdpr] (community-maintained reference; canonical text
at eur-lex.europa.eu Regulation 2016/679):

[gdpr]: https://gdpr.eu/

GDPR (General Data Protection Regulation, in force 2018-05-25)
applies to any processing of EU personal data regardless of the
processor's location. Failure to demonstrate compliance carries
fines up to €20M or 4% of global annual turnover (whichever higher).

This is a **reference skill** (S2) — defines the test-pattern
catalog by Article. Tests use the team's existing test framework;
this skill is the per-Article test recipe.

## When to use

- Product processes EU personal data (regardless of processor location).
- Regulatory audit requires evidence of test coverage for
  data-subject rights.
- New feature touches PII handling (signup, profile, billing,
  analytics, third-party sharing).
- DPIA (Data Protection Impact Assessment) requires test evidence.

## Test patterns by GDPR Article

### Art. 7 — Conditions for consent

```python
def test_consent_recorded_at_collection_time():
    response = client.post('/signup', json={
        'email': 'alice@example.com',
        'consent_marketing': True,
        'consent_timestamp': '2026-05-06T12:00:00Z',
    })
    user = User.objects.get(email='alice@example.com')
    consent = ConsentRecord.objects.get(user=user, scope='marketing')
    assert consent.granted is True
    assert consent.granted_at is not None
    assert consent.granted_via == 'signup-form'   # auditable evidence

def test_consent_revocable():
    revoke_consent(user, scope='marketing')
    consent = ConsentRecord.objects.get(user=user, scope='marketing')
    assert consent.granted is False
    assert consent.revoked_at is not None
    # Subsequent marketing emails must not be sent:
    assert not user.is_eligible_for(EmailType.MARKETING)
```

### Art. 15 — Right of access

```python
def test_subject_access_request_returns_all_personal_data():
    response = authenticated_client.post('/sar', json={'subject_email': 'alice@example.com'})
    assert response.status_code == 200
    data = response.json()
    # Must include data from EVERY system that holds PII for this subject:
    assert 'profile' in data
    assert 'billing' in data
    assert 'support_tickets' in data
    assert 'analytics' in data       # often forgotten; tests catch it
    assert 'third_party_sharing' in data
    # Response must arrive within 1 month per Art. 12(3):
    assert response.headers['X-Processing-Time'] < timedelta(days=30)
```

### Art. 17 — Right to erasure ("right to be forgotten")

```python
def test_erasure_removes_all_personal_data():
    erase_subject('alice@example.com')

    # Across ALL systems:
    assert User.objects.filter(email='alice@example.com').count() == 0
    assert BillingRecord.objects.filter(user_email='alice@example.com').count() == 0
    assert AnalyticsEvent.objects.filter(user_email='alice@example.com').count() == 0
    # Backup retention: erasure marker recorded; backup expires within retention window
    assert ErasureMarker.objects.filter(subject='alice@example.com').exists()
```

### Art. 20 — Right to data portability

```python
def test_data_portability_export_machine_readable():
    response = client.post('/data-export', json={'subject': 'alice@example.com'})
    export = response.json()
    # Must be in "structured, commonly used and machine-readable format"
    assert response.headers['Content-Type'] in ['application/json', 'text/csv', 'application/xml']
    # Format must be self-describing (keys not random IDs):
    assert 'profile' in export
    assert 'orders' in export
```

### Art. 33 — Breach notification (72-hour test)

```python
def test_breach_notification_workflow_within_72h():
    # Simulate a breach detection event
    breach = BreachIncident.create(detected_at=timezone.now())
    # Workflow MUST notify supervisory authority within 72 hours:
    deadline = breach.detected_at + timedelta(hours=72)
    notification = BreachNotification.objects.filter(incident=breach).first()
    assert notification is not None
    assert notification.sent_at <= deadline
    assert notification.recipient == 'supervisory.authority@dpa.example.eu'
```

### Art. 44–50 — International transfers (data residency)

```python
def test_eu_user_data_stored_in_eu_region():
    user = User.objects.create(email='alice@example.fr', region='EU')
    # Storage assertions vary by infra (AWS region, GCP region, etc.):
    assert user.storage_region in ['eu-west-1', 'eu-central-1', 'eu-north-1']
    # Cross-region replication MUST stay in EU:
    backups = Backup.objects.filter(user=user)
    for b in backups:
        assert b.region in EU_REGIONS
```

### Art. 5(1)(c) — Data minimization

```python
def test_signup_fixtures_contain_only_required_pii():
    fixture = load_fixture('user_signup.json')
    required = {'email', 'consent_terms', 'consent_marketing'}
    optional = {'phone', 'city', 'date_of_birth'}
    for k in fixture.keys():
        assert k in required | optional, f"Unrecognized field: {k}"
    # No SSN, no passport number, no genetic / biometric data unless explicitly justified:
    forbidden = {'ssn', 'passport', 'genetic_data', 'biometric_data'}
    for k in forbidden:
        assert k not in fixture, f"Forbidden PII type: {k}"
```

## Key compliance gaps tests should catch

| Gap | Detection |
|---|---|
| Marketing emails sent to revoked-consent users | Step Art. 7 + email-flow tests |
| SAR returns incomplete dataset (missing analytics/CRM) | Step Art. 15 multi-system assertion |
| Erasure leaves data in unindexed backup tables | Step Art. 17 multi-system assertion |
| EU user data quietly replicated to US region | Step Art. 44–50 region assertion |
| Breach detected but DPO not notified within 72h | Step Art. 33 timing test |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only main-app data store on SAR/erasure | Misses analytics, CRM, support, backups | Multi-system assertion (Steps Art. 15 + 17) |
| Hardcode 30-day SAR window assumption | GDPR allows extension to 3 months in complex cases | Test timeline against actual policy doc |
| Test consent recording without revocation | Half the workflow uncovered | Both grant + revoke tests (Step Art. 7) |
| Fixture data uses real customer PII | GDPR violation in tests themselves | Use [`synthetic-pii-generator`](../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) |
| Skip data-minimization assertions | New PII types creep in via schema changes | Step Art. 5(1)(c) field-allowlist test |

## Limitations

- This skill is a test-pattern catalog, not legal advice. GDPR
  interpretation has nuance per supervisory authority (CNIL, ICO,
  DPA per country).
- Tests verify implementation; they don't replace a DPIA or legal
  review.
- Article numbers refer to GDPR text; consult eur-lex.europa.eu
  for canonical wording.
- Subject-access-request workflow varies per organization; test
  templates above are starting points.

## References

- [gdpr][gdpr] — community reference + Article navigation
- eur-lex.europa.eu/eli/reg/2016/679/oj — canonical GDPR text
- edpb.europa.eu — European Data Protection Board guidelines
- ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/ — UK ICO guide
- [`synthetic-pii-generator`](../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) —
  cross-plugin: safe test fixture generation
- [`ccpa-test-patterns`](../ccpa-test-patterns/SKILL.md) — sister: California analogue
- [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md) — companion: GDPR audit logs
- [`compliance-readiness-reviewer`](../../agents/compliance-readiness-reviewer.md) — agent
