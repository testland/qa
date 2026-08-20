---
name: negative-test-generator
description: "Covers the refusal paths a handler already implements but nothing tests - a batch endpoint that must apply all rows or none, optimistic-concurrency version conflicts between two editors, or a delete that deliberately separates who you are from what you may do from the state the record is in. For each happy-path test, produces companions exercising input validation rejection, missing required fields, type mismatches, authorization failures, rate-limit errors, and adversarial payloads from the malicious-payload-bank, emitted as parameterized tests in the project's runner format. Use when code has deliberate error paths and the suite only proves the success case."
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
- Pairs with `gherkin-from-stories` (in the qa-bdd plugin)
  output: every Then-clause's positive assertion gets a negative
  sibling.

## Negative-path categories

For each happy-path test of `<verb> <path>` with body fields
`<f1, f2, ...>`, generate companions across these categories:

1. **Schema violations** - missing required, wrong type, out-of-range, wrong enum, bad format, extra/unknown field, null-where-forbidden, excess length.
2. **Authentication failures** - no / expired / malformed / cross-tenant token; expect 401.
3. **Authorization failures** - missing permission, IDOR, cross-tenant access; expect 403 / 404.
4. **Rate / quota failures** - burst over limit (429), plan quota exceeded.
5. **Conflict / state errors** - duplicate (409), optimistic-lock (412), invalid state transition (422 / 409).
6. **Adversarial inputs** - XSS, SQLi, SSRF, path traversal, ReDoS, Unicode confusables from `malicious-payload-bank`. Assert **reject (4xx) or escaped output** - never that the payload merely "didn't crash".
7. **Server errors** - upstream unavailable (502 / 503) or timeout (504) via `api-chaos-runner`.

Per-pattern test tables and the starter adversarial-payload catalog
(with CWE / OWASP references):
[references/negative-path-catalog.md](references/negative-path-catalog.md).

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
| Negative-path coverage but no `_synthetic` data             | Real-looking PII flows through; compliance issue if logs leak.     | Use `synthetic-pii-generator` for any field that could be PII. |
| Asserting `'error' in response.body`                         | Brittle; error-message text changes; locale-specific bugs.         | Assert structured field: `response.json()['errors']['<field>']` or `response.headers['X-Error-Code']`. |

## Limitations

- **Doesn't auto-detect input domain.** The team must declare
  required fields, types, ranges, and enum values for the skill
  to generate the matching cases. Use `gherkin-from-stories`
  + `non-functional-requirement-extractor`
  upstream.
- **Server-error simulation requires mocking.** Categories 5 and 7
  need `api-chaos-runner`
  or `wiremock-stubs` /
  `msw-handlers` for the upstream
  failure simulation.
- **Per-language output styling.** Test scaffolding adapts to
  pytest / Jest / xUnit / JUnit; the skill emits the project's
  preferred runner format.

## References

- `gherkin-from-stories` (qa-bdd plugin) - upstream skill producing the happy-path AC.
- `malicious-payload-bank` - adversarial payload catalog (category 6).
- `boundary-value-generator` - sibling skill for boundary cases.
- `synthetic-pii-generator` - for any test data that includes PII.
