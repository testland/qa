---
name: negative-test-generator
description: "Generates negative / error-path test cases that mirror happy-path tests - for each happy-path test, produces companions exercising input validation rejection, missing required fields, type mismatches, authorization failures, rate-limit errors, and adversarial payloads from the malicious-payload-bank. Emits cases as parameterized tests in the project's runner format. Use when a feature has happy-path coverage but the rejection / error / unauthorized paths are untested."
---

# negative-test-generator

## Overview

A typical test suite has a happy-path test for every endpoint:
"valid input → 200 / created object / etc." What's missing is the
**rejection path** - what happens with malformed input, missing
fields, wrong type, unauthorized user, rate-limited request,
adversarial payload?

This skill takes a happy-path test and emits its negative
companions - one per failure mode. The result is a paired set
where every "should accept X" has a sibling "should reject Y"
catalog.

## When to use

- A feature has a happy-path test but no error-path coverage.
- An API endpoint accepts user input without documented rejection
  testing.
- A team is migrating from "test only what works" to "test every
  documented response code."
- Pairs with `acceptance-criteria-extractor` (in the qa-shift-left plugin)
  output: every Then-clause's positive assertion gets a negative
  sibling.

## Negative-path categories

For each happy-path test of a request `<verb> <path>` with body
fields `<f1, f2, ...>`, the negative-test set covers:

### 1. Schema violations (validation rejection)

| Pattern                                | Test                                                |
|----------------------------------------|-----------------------------------------------------|
| Missing required field                  | Send the request without `<f1>`; expect 400 with `<f1>` named. |
| Wrong type                              | Send `<f1>` as wrong type (string where int expected); expect 400. |
| Out-of-range value                      | Send `<f1>` outside `[min, max]` per [`boundary-value-generator`](../boundary-value-generator/SKILL.md); expect 400. |
| Wrong enum value                        | Send `<f1>` with a value not in `enum_values`; expect 400. |
| Wrong format                            | String that fails the regex / format constraint; expect 400. |
| Extra unknown field                     | Send field not in the schema; behavior depends on policy (strict reject vs. ignore). |
| Empty / null where forbidden            | Send `null` or empty string for a non-nullable field. |
| Excess length / count                   | Send string longer than max-length; collection larger than max-count. |

### 2. Authentication failures

| Pattern                            | Test                                            |
|------------------------------------|-------------------------------------------------|
| No `Authorization` header           | Expect 401.                                      |
| Expired token                        | Expect 401 with `token expired` indication.     |
| Malformed token                      | Expect 401, no info leak about token shape.     |
| Token from a different tenant        | Expect 401 / 403.                                |

### 3. Authorization failures

| Pattern                            | Test                                              |
|------------------------------------|---------------------------------------------------|
| User without permission              | Authenticated but role lacks required permission; expect 403. |
| Resource owned by another user        | Read/write attempt on someone else's resource (IDOR); expect 403 / 404. |
| Cross-tenant access                   | Attempt resource from another organization; expect 403 / 404. |

### 4. Rate / quota failures

| Pattern                            | Test                                              |
|------------------------------------|---------------------------------------------------|
| Burst exceeds rate limit            | Send N+1 requests in window; expect 429.          |
| Plan quota exceeded                  | Free-tier user exceeds Free quota; expect 403 / 429 with quota info. |

### 5. Conflict / state errors

| Pattern                            | Test                                              |
|------------------------------------|---------------------------------------------------|
| Duplicate creation                   | Create same resource twice; expect 409.          |
| Optimistic-lock conflict             | Stale `If-Match`; expect 412.                     |
| State machine violation              | Invalid status transition (e.g. `placed → completed` skipping `shipped`); expect 422 / 409. |

### 6. Adversarial inputs

Pull from [`malicious-payload-bank`](../malicious-payload-bank/SKILL.md):

| Field type                   | Payload classes                                  |
|------------------------------|--------------------------------------------------|
| Free-text input               | XSS, SQLi, Unicode confusables                  |
| URL field                     | SSRF, open-redirect                              |
| File upload name              | Path traversal                                   |
| Search field                  | ReDoS, SQLi                                      |

### 7. Server errors (where applicable)

| Pattern                            | Test                                              |
|------------------------------------|---------------------------------------------------|
| Upstream dependency unavailable    | Mock the dependency to fail (per `api-chaos-runner`); expect 502 / 503 with retry hint. |
| Timeout                            | Mock slow upstream; expect 504 / circuit-breaker fallback. |

## Worked example

Given a happy-path test:

```python
def test_create_order_succeeds():
    response = post('/api/orders',
                    headers={'Authorization': f'Bearer {token}'},
                    json={'sku': 'SKU-1', 'qty': 2})
    assert response.status_code == 201
    assert response.json()['order_id']
```

The skill emits negative companions:

```python
import pytest
from tests.fixtures import token, expired_token, free_tier_token
from tests.payloads import XSS, SQLI

# 1. Schema violations
@pytest.mark.parametrize('body,expected_status,expected_field', [
    ({'qty': 2},                  400, 'sku'),         # missing required
    ({'sku': 'SKU-1'},            400, 'qty'),         # missing required
    ({'sku': 'SKU-1', 'qty': 'two'}, 400, 'qty'),    # wrong type
    ({'sku': 'SKU-1', 'qty': 0},  400, 'qty'),         # below min
    ({'sku': 'SKU-1', 'qty': -1}, 400, 'qty'),         # negative
    ({'sku': 'SKU-1', 'qty': 1000000}, 400, 'qty'),    # above max
    ({'sku': 'INVALID-SKU', 'qty': 2}, 400, 'sku'),     # unknown enum
])
def test_create_order_schema_rejects(body, expected_status, expected_field):
    response = post('/api/orders',
                    headers={'Authorization': f'Bearer {token}'},
                    json=body)
    assert response.status_code == expected_status
    assert expected_field in response.json().get('errors', {})

# 2. Auth failures
def test_create_order_no_token():
    response = post('/api/orders', json={'sku': 'SKU-1', 'qty': 2})
    assert response.status_code == 401

def test_create_order_expired_token():
    response = post('/api/orders',
                    headers={'Authorization': f'Bearer {expired_token}'},
                    json={'sku': 'SKU-1', 'qty': 2})
    assert response.status_code == 401

# 3. Authorization failures
def test_create_order_free_tier_blocked_for_premium_sku():
    response = post('/api/orders',
                    headers={'Authorization': f'Bearer {free_tier_token}'},
                    json={'sku': 'PREMIUM-1', 'qty': 1})
    assert response.status_code == 403

# 6. Adversarial payloads
@pytest.mark.parametrize('payload', XSS + SQLI)
def test_create_order_handles_adversarial_sku(payload):
    response = post('/api/orders',
                    headers={'Authorization': f'Bearer {token}'},
                    json={'sku': payload, 'qty': 1})
    # Either reject (preferred) or escape - never pass through with execution
    assert response.status_code in (400, 404, 422)
    assert '<script>' not in response.text
```

## Output format

```markdown
## Negative tests for `<endpoint>` - `<verb> <path>`

**Happy path:** `tests/<file>::test_<happy_name>`
**Negative companions generated:** N (across 6 categories)

### Tests by category

| Category               | Count | File                                                |
|------------------------|------:|-----------------------------------------------------|
| Schema violations      |    7  | `tests/<file>::test_<endpoint>_schema_rejects`     |
| Auth failures          |    2  | `tests/<file>::test_<endpoint>_no_token` etc.       |
| Authorization failures |    1  | `tests/<file>::test_<endpoint>_unauthorized`        |
| Rate/quota failures    |    0  | (skipped; rate-limit not yet implemented)           |
| Conflict/state errors  |    1  | `tests/<file>::test_<endpoint>_duplicate`           |
| Adversarial payloads   |    8  | `tests/<file>::test_<endpoint>_handles_adversarial`|

### Skipped categories

- Rate/quota failures: rate limiting not yet implemented; revisit when added.
- Server errors: covered by `api-chaos-runner` in a separate suite.

### Recommended next step

1. Run the new negative tests; expect all to pass given the
   documented behavior.
2. Any failure indicates a real gap - either the validator is
   missing the case OR the assertion is wrong.
3. For passes: commit.
```

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                       | Fix |
|-------------------------------------------------------------|---------------------------------------------------------------------|-----|
| Negative tests that assert vague status codes ("not 200")    | The test passes if the server returns 500 (a bug); should fail.    | Always assert specific status: 400 for validation, 401 for auth, 403 for authz, 429 for rate, etc. |
| Skipping the "wrong type" cases                              | The most common validator bug class.                                | Always include type-mismatch cases for every field. |
| One mega-test that covers all negatives                     | Failure attribution unclear; one failure cascades.                 | Parameterize per category; one test function per category. |
| Negative-path coverage but no `_synthetic` data             | Real-looking PII flows through; compliance issue if logs leak.     | Use [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md) for any field that could be PII. |
| Asserting `'error' in response.body`                         | Brittle; error-message text changes; locale-specific bugs.         | Assert structured field: `response.json()['errors']['<field>']` or `response.headers['X-Error-Code']`. |

## Limitations

- **Doesn't auto-detect input domain.** The team must declare
  required fields, types, ranges, and enum values for the skill
  to generate the matching cases. Use `acceptance-criteria-extractor`
  + `non-functional-requirement-extractor`
  upstream.
- **Server-error simulation requires mocking.** Categories 5 and 7
  need `api-chaos-runner`
  or [`wiremock-stubs`](../wiremock-stubs/SKILL.md) /
  [`msw-handlers`](../msw-handlers/SKILL.md) for the upstream
  failure simulation.
- **Per-language output styling.** Test scaffolding adapts to
  pytest / Jest / xUnit / JUnit; the skill emits the project's
  preferred runner format.

## References

- `acceptance-criteria-extractor` - upstream skill producing the happy-path AC.
- [`malicious-payload-bank`](../malicious-payload-bank/SKILL.md) - adversarial payload catalog (category 6).
- [`boundary-value-generator`](../boundary-value-generator/SKILL.md) - sibling skill for boundary cases.
- [`synthetic-pii-generator`](../synthetic-pii-generator/SKILL.md) - for any test data that includes PII.
