---
name: hipaa-test-patterns
description: "Reference catalog of HIPAA Security Rule-aligned test patterns — administrative safeguards (45 CFR §164.308: workforce training, access management, contingency planning), physical safeguards (§164.310: facility access, workstation security, device disposal), technical safeguards (§164.312: access control, audit logs, integrity, transmission security); PHI handling assertions in fixtures; minimum-necessary tests per §164.502(b); BAA-scope boundary verification. Use when authoring HIPAA-readiness tests for any product handling Protected Health Information."
rating: 22
d6: 4
archetype: S2
---

# hipaa-test-patterns

[hipaa-hhs]: https://www.hhs.gov/hipaa/

Reference catalog of test patterns by HIPAA Security Rule section
(45 CFR §164). Pair with [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md)
for §164.312(b) audit-log requirements. Anchors:
[hhs.gov/hipaa][hipaa-hhs] and NIST SP 800-66.

## When to use

- Product is a Business Associate handling PHI for a Covered Entity
  (or is itself a Covered Entity).
- BAA (Business Associate Agreement) signed; need test evidence.
- HIPAA risk assessment requires test coverage evidence.
- New feature touches PHI (medical records, billing, scheduling,
  clinical decision support).

## What is PHI?

Per HHS, PHI = individually identifiable health information +
created/received/maintained/transmitted by a covered entity. The
18 HIPAA identifiers per §164.514(b)(2) (Safe Harbor):

```
1. Name
2. Geographic subdivisions smaller than state (ZIP codes need restrictions)
3. All elements of dates (except year) for dates directly related to an individual
4. Telephone numbers
5. Vehicle identifiers + license plates
6. Fax numbers
7. Device identifiers + serial numbers
8. Email addresses
9. Web URLs
10. SSN
11. IP addresses
12. Medical record numbers
13. Biometric identifiers (fingerprints, voiceprints)
14. Health plan beneficiary numbers
15. Full-face photos + comparable images
16. Account numbers
17. Any other unique identifying number / characteristic / code
18. Certificate / license numbers
```

Test fixtures for HIPAA-scope systems MUST avoid these 18
identifiers (or use the [`synthetic-pii-generator`](../../qa-test-data/skills/synthetic-pii-generator/SKILL.md)
to generate safe substitutes).

## Test patterns by Security Rule section

### §164.308(a)(3) — Workforce access management

```python
def test_user_role_grants_only_minimum_necessary_phi():
    """§164.502(b) minimum necessary standard."""
    user = User.objects.create(role='billing-clerk')
    # Billing clerks access financial PHI but NOT clinical notes
    assert user.can_access(PhiType.BILLING)
    assert not user.can_access(PhiType.CLINICAL_NOTES)
    assert not user.can_access(PhiType.GENETIC_TEST_RESULTS)
```

### §164.308(a)(5) — Workforce training

Test that training-completion is enforced before access grant:

```python
def test_user_cannot_access_phi_without_training_completion():
    user = User.objects.create(role='nurse', hipaa_training_completed=False)
    response = client.get('/patient/123/records', headers={'Authorization': f'Bearer {user.token}'})
    assert response.status_code == 403
    assert 'training_required' in response.json()['error']
```

### §164.310(d)(2) — Device + media disposal

```python
def test_phi_overwritten_when_device_decommissioned():
    device = Device.objects.create(serial='ABC123', has_phi=True)
    decommission(device)
    # Device record marked as wiped + audit log entry
    device.refresh_from_db()
    assert device.status == 'wiped'
    assert device.wipe_method in ['NIST 800-88 Clear', 'NIST 800-88 Purge']
    assert AuditLog.objects.filter(action='device_wipe', subject=device.serial).exists()
```

### §164.312(a)(1) — Access control

```python
def test_phi_access_requires_unique_user_id():
    """§164.312(a)(2)(i) Unique User Identification — no shared accounts."""
    # System must reject login attempts on generic / shared accounts:
    response = client.post('/login', json={'username': 'admin', 'password': 'secret'})
    assert response.status_code == 403  # generic 'admin' account forbidden
```

### §164.312(b) — Audit controls

Cross-ref [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md):

```python
def test_phi_access_creates_audit_record():
    """§164.312(b): record + examine activity in info systems containing PHI."""
    user = User.objects.create(role='nurse')
    client.get(f'/patient/{patient.id}/records', headers={'Authorization': f'Bearer {user.token}'})

    audit = AuditLog.objects.filter(
        actor=user.id,
        action='phi_access',
        subject=f'patient:{patient.id}',
    ).first()
    assert audit is not None
    assert audit.timestamp is not None
    assert audit.tamper_evident_hash is not None   # required for integrity
```

### §164.312(c)(1) — Integrity

```python
def test_phi_modification_requires_authentication_and_audit():
    """§164.312(c)(1): protect ePHI from improper alteration / destruction."""
    user_unauth = User.objects.create(role='intake-staff')
    response = client.put(
        f'/patient/{patient.id}/records',
        json={'diagnosis': 'modified'},
        headers={'Authorization': f'Bearer {user_unauth.token}'},
    )
    assert response.status_code == 403  # intake staff cannot modify clinical
    # Even authorized modification is logged:
    user_doc = User.objects.create(role='physician')
    response = client.put(
        f'/patient/{patient.id}/records',
        json={'diagnosis': 'updated'},
        headers={'Authorization': f'Bearer {user_doc.token}'},
    )
    audit = AuditLog.objects.filter(
        action='phi_modify',
        subject=f'patient:{patient.id}',
        actor=user_doc.id,
    ).first()
    assert audit.before_value == 'original'
    assert audit.after_value == 'updated'
```

### §164.312(e)(1) — Transmission security

```python
def test_phi_transmitted_only_via_encrypted_channels():
    """§164.312(e)(2)(ii): encryption in transit for PHI."""
    # Plaintext HTTP must redirect or refuse:
    response = http_client.get('http://api.example.com/patient/123')
    assert response.status_code in [301, 308, 403]
    # HTTPS must use TLS 1.2+ + secure ciphers:
    tls_info = inspect_tls('https://api.example.com')
    assert tls_info.protocol >= 'TLSv1.2'
    assert tls_info.cipher in ALLOWED_CIPHERS
```

### §164.502(b) — Minimum necessary standard

```python
def test_query_returns_only_minimum_necessary_fields():
    response = client.get(
        '/patient/123/billing-summary',
        headers={'Authorization': f'Bearer {billing_clerk_token}'},
    )
    body = response.json()
    # Billing summary should NOT include clinical notes or sensitive fields:
    assert 'amount_due' in body
    assert 'insurance_provider' in body
    assert 'clinical_notes' not in body
    assert 'medications' not in body
    assert 'genetic_test_results' not in body
```

### §164.504(e) — Business Associate Agreement scope

```python
def test_phi_only_processed_for_baa_purposes():
    # Test fixture: BAA scope = appointment-scheduling only
    baa = BusinessAssociateAgreement.objects.get(partner='SchedulingVendor')
    assert baa.allowed_purposes == ['appointment_scheduling']

    # Vendor SHOULD NOT be able to access PHI for non-scheduling purposes:
    vendor_user = User.objects.create(employer='SchedulingVendor')
    response = client.get(
        '/patient/123/billing',
        headers={'Authorization': f'Bearer {vendor_user.token}'},
    )
    assert response.status_code == 403
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Real PHI in test fixtures | HIPAA violation in tests | [`synthetic-pii-generator`](../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) + de-identified data |
| Audit log without tamper-evidence | Logs can be modified post-incident | Hash-chain or signed-batch log integrity (§164.312(b)) |
| Role-based access without minimum-necessary check | Over-broad access; minimum-necessary violation | Per-PHI-type test (Step §164.502(b)) |
| Skip BAA scope tests | Vendor accesses PHI outside agreement | Step §164.504(e) scope test |
| Allow plaintext HTTP for PHI even in dev | Production drift; eventual leak | Always enforce HTTPS (Step §164.312(e)) |

## Limitations

- This skill targets HIPAA Security Rule. HIPAA Privacy Rule (45
  CFR §164 Subpart E) has additional requirements (use/disclosure
  rules, accounting of disclosures); test patterns there are
  use-case specific.
- HITECH Act (2009) added breach-notification + enforcement; tests
  intersect with §164.404–§164.414.
- State laws (e.g., California CMIA) may add additional
  requirements beyond HIPAA.
- This skill doesn't replace a HIPAA risk analysis or compliance
  consultant.

## References

- [hipaa-hhs][hipaa-hhs] — HHS HIPAA reference
- ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164 —
  HIPAA regulations text (45 CFR §164)
- nist.gov/publications/sp-800-66-revision-1-introductory-resource-guide-implementing-hipaa-security
  — NIST SP 800-66 implementation guidance
- nist.gov/publications/sp-800-88-revision-1-guidelines-media-sanitization
  — NIST SP 800-88 device sanitization
- [`gdpr-test-patterns`](../gdpr-test-patterns/SKILL.md),
  [`ccpa-test-patterns`](../ccpa-test-patterns/SKILL.md) — sister
  privacy-pattern catalogs
- [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md) —
  §164.312(b) audit log requirements
- [`synthetic-pii-generator`](../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) —
  cross-plugin: safe PHI fixture generation
- [`compliance-readiness-reviewer`](../../agents/compliance-readiness-reviewer.md) — agent
