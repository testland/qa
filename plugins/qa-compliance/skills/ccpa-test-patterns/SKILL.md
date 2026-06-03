---
name: ccpa-test-patterns
description: "Reference catalog of CCPA + CPRA-aligned test patterns - do-not-sell-or-share opt-out via Global Privacy Control (GPC) signal; data-disclosure category tests per Cal. Civ. Code §1798.110; sensitive personal information (SPI) handling per CPRA §1798.121; deletion-request workflows per §1798.105; CPRA's right to correct (§1798.106) + limit-use (§1798.121). Use when authoring CCPA/CPRA-readiness tests for any product processing California consumer data."
rating: 22
d6: 4
---

# ccpa-test-patterns

## Overview

Per [oag.ca.gov/privacy/ccpa][ccpa-oag] (California Attorney General
authoritative source):

[ccpa-oag]: https://oag.ca.gov/privacy/ccpa

CCPA (California Consumer Privacy Act, in force 2020-01-01) and
CPRA (California Privacy Rights Act, in force 2023-01-01) apply
to businesses meeting one of three thresholds:

- $25M+ annual gross revenue
- Buys, sells, or shares the personal info of 100,000+ California consumers
- Derives 50%+ revenue from selling/sharing California consumer info

Failure carries civil penalties up to $7,500 per intentional
violation + $2,500 per non-intentional violation; private right of
action for data breaches.

This is a **reference skill** - defines the test-pattern
catalog by Cal. Civ. Code section. Pair with [`gdpr-test-patterns`](../gdpr-test-patterns/SKILL.md)
for international compliance footprint.

## When to use

- Product processes California consumer data + meets a CCPA threshold.
- Privacy compliance program requires evidence of CCPA test coverage.
- New feature touches consumer data (signup, profile, billing,
  analytics, third-party sharing).
- CPRA-specific features (sensitive PI handling, right to correct)
  need verification.

## Test patterns by Cal. Civ. Code section

### §1798.135 - Right to opt out via Global Privacy Control (GPC)

CPRA mandates honoring the GPC browser signal (per
[globalprivacycontrol.org](https://globalprivacycontrol.org/)):

```python
def test_gpc_signal_blocks_sale_and_share():
    response = client.get('/page', headers={'Sec-GPC': '1'})
    # Page MUST treat the visitor as opted-out:
    assert 'do-not-sell-cookie' in response.cookies
    # Tracking pixels for sale/share must NOT fire:
    assert 'analytics-share.js' not in response.text
    assert 'ads-third-party.js' not in response.text
    # Status MUST be recorded for compliance evidence:
    assert OptOutRecord.objects.filter(visitor_id=session_id).exists()
```

### §1798.110 - Right to know (categories of PI collected)

```python
def test_consumer_request_returns_all_pi_categories():
    response = client.post('/privacy/right-to-know', json={
        'consumer_email': 'alice@example.com'
    })
    body = response.json()
    # CCPA Cat. 11 personal info categories:
    expected = {
        'identifiers',
        'commercial_info',
        'biometric_info',
        'internet_activity',
        'geolocation_data',
        'professional_or_employment',
        'inferences',
    }
    # Test asserts every category present in response (NULL acceptable):
    for cat in expected:
        assert cat in body
```

### §1798.105 - Right to delete

```python
def test_deletion_request_completes_within_45_days():
    request = DeletionRequest.create(consumer_email='alice@example.com')
    # CCPA: 45 days, extendable by 45 more (90 max) with notice
    deadline = request.received_at + timedelta(days=45)
    completion = DeletionRequest.objects.get(id=request.id)
    assert completion.status == 'completed'
    assert completion.completed_at <= deadline
```

### §1798.121 - Right to limit sensitive PI use (CPRA)

```python
def test_limit_sensitive_pi_use():
    # Consumer requests limit on sensitive PI (per CPRA SPI categories)
    submit_limit_request(consumer='alice@example.com')
    # Subsequent processing MUST NOT use SPI for inference / advertising:
    response = client.get('/recommendations', headers={'X-Consumer-Email': 'alice@example.com'})
    # Recommendations engine MUST NOT use SPI (geolocation, racial, religious, etc.):
    used_features = response.json()['feature_attribution']
    forbidden_spi = {'precise_geolocation', 'racial_ethnic', 'religious', 'union_membership'}
    for feature in used_features:
        assert feature not in forbidden_spi
```

### §1798.106 - Right to correct (CPRA)

```python
def test_correction_request_updates_records_within_45_days():
    submit_correction(consumer='alice@example.com', field='name', value='Alice Smith')
    deadline = timezone.now() + timedelta(days=45)
    # All systems must reflect the correction:
    assert User.objects.get(email='alice@example.com').name == 'Alice Smith'
    assert BillingRecord.objects.get(user_email='alice@example.com').name == 'Alice Smith'
    # Third parties that received the prior incorrect value must be notified:
    assert NotificationLog.objects.filter(
        type='correction_propagation',
        recipient='third-party-vendor@example.com',
    ).exists()
```

### §1798.130 - Notice requirements

```python
def test_privacy_policy_disclosed_at_collection():
    # Every PI collection point must disclose categories + purposes
    response = client.get('/signup')
    assert 'privacy-notice' in response.text
    assert any(link in response.text for link in [
        '/do-not-sell-or-share',
        '/limit-sensitive-pi-use',
    ])
    # Disclosed categories MUST match what's actually collected
    disclosed = parse_privacy_notice(response.text)
    actual = analyze_signup_form(response.text)
    assert disclosed >= actual   # disclosure is superset of collection
```

## Sensitive Personal Information categories (CPRA §1798.140(ae))

| Category | Examples |
|---|---|
| Government IDs | SSN, driver's license, passport, alien registration |
| Account login + credentials | Username + password / security questions |
| Precise geolocation | <1850 ft / 564 m radius |
| Racial / ethnic origin | Self-reported demographics |
| Religious / philosophical beliefs | Religious affiliation |
| Union membership | Trade union status |
| Communication content | Email body, SMS body, message content |
| Genetic data | DNA test results |
| Biometric for unique identification | Faceprint, voiceprint, fingerprint |
| Health info | Medical history, medications |
| Sexual orientation / sex life | Self-reported orientation |

Test patterns above (§1798.121) protect these categories specifically.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Honor opt-out cookie but ignore GPC header | CPRA mandates GPC support | Step §1798.135 GPC test |
| Right-to-know returns only main app data | Misses analytics, CRM | Multi-system response (Step §1798.110) |
| Correction propagated only locally | Third parties retain incorrect data | Notification log assertion (Step §1798.106) |
| SPI categorical restriction tested only at API edge | Inference engines bypass | Feature-attribution-level test (Step §1798.121) |
| Test fixtures use real California PII | CCPA violation in tests | [`synthetic-pii-generator`](../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) |

## Limitations

- This skill targets CCPA + CPRA. Other US state privacy laws
  (Virginia VCDPA, Colorado CPA, Connecticut CTDPA, Utah UCPA,
  Texas TDPSA, etc.) have similar but not identical patterns.
- Tests verify implementation; legal review still required for
  compliance attestation.
- CPRA enforcement by California Privacy Protection Agency (CPPA);
  sub-regulations evolve.
- Some patterns (precise-geolocation 1850-ft threshold) require
  domain-specific test data.

## References

- [ccpa-oag][ccpa-oag] - California Attorney General CCPA + CPRA reference
- cppa.ca.gov - California Privacy Protection Agency
- leginfo.legislature.ca.gov - California Civil Code §1798.100 - .199
- globalprivacycontrol.org - GPC technical specification
- iapp.org/resources/article/state-comparison/ - state-law comparison
- [`gdpr-test-patterns`](../gdpr-test-patterns/SKILL.md) - sister: EU analogue
- [`synthetic-pii-generator`](../../qa-test-data/skills/synthetic-pii-generator/SKILL.md) - 
  safe test data generation
- [`audit-trail-test-author`](../audit-trail-test-author/SKILL.md) - audit log requirements
- [`compliance-readiness-reviewer`](../../agents/compliance-readiness-reviewer.md) - agent
