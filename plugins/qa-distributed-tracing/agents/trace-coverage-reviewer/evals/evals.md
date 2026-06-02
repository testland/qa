---
component: trace-coverage-reviewer
type: agent
archetype: A3
---

# trace-coverage-reviewer - evals

Companion eval cases for [`trace-coverage-reviewer`](../../trace-coverage-reviewer.md).
Three cases cover happy path / branch / adversarial: a service with an
untraced HTTP client + a PII cardinality risk (verdict `BLOCK`), a
service with full auto-instrumentation and clean SemConv (verdict
`pass` / no Critical findings), and a request to add a `user.email`
attribute to a high-traffic span (refuse - PII + cardinality rule).

Target models for re-runs: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`,
`claude-opus-4-7`. Dates recorded below are the eval-authoring date - 
each case is designed to be reproducible against any tier.

## Eval 1 - happy path - untraced HTTP client + PII cardinality risk (BLOCK)

**Input:**

```
Review OpenTelemetry instrumentation coverage for the `auth-service`
Python project @ commit ab12cd3.

Detected auto-instrumentation libs (from requirements.txt):
  opentelemetry-instrumentation-psycopg2==0.46b0
  # NOTE: no opentelemetry-instrumentation-requests installed

File: auth/session.py
```python
import requests

def fetch_identity(user_id):
    # NO surrounding tracer.start_as_current_span; no auto-instrumentation
    # for requests installed
    resp = requests.post(
        "https://identity.example.com/v1/lookup",
        json={"user_id": user_id},
        timeout=2.0,
    )
    return resp.json()
```

File: orders/process.py
```python
from opentelemetry import trace
tracer = trace.get_tracer(__name__)

def process_order(order, user):
    with tracer.start_as_current_span("orders.process") as span:
        span.set_attribute("user.email", user.email)  # high-traffic span
        span.set_attribute("order.id", order.id)
        # ... order processing ...
```

File: payments/charge.py
```python
with tracer.start_as_current_span("payments.charge") as span:
    span.set_attribute("http.method", "POST")   # deprecated key
    span.set_attribute("http.url", url)         # deprecated key
    resp = requests.post(url, json=payload)
```

No trace spec file present under docs/observability/.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 detects the HTTP-client call site in
`auth/session.py:5` as untraced (no auto-instrumentation, no manual
span). Step 5 detects `user.email` on a high-traffic span as a
cardinality risk + PII leak - flagged as Critical. Step 3 detects
`http.method` and `http.url` in `payments/charge.py` as deprecated
SemConv keys (should be `http.request.method` and `url.full`). Step 4
notes the manual span around the requests call in `payments/charge.py`
is hand-rolled where auto-instrumentation should be used. Step 8 emits
verdict `BLOCK` with at least 2 Critical findings (untraced HTTP client
+ PII cardinality risk). Spec-drift section is omitted (no spec
present).

**Pass condition:** Output contains the literal string `BLOCK`
(case-sensitive) AND contains at least one of `user.email` / `PII` /
`cardinality` (case-sensitive on `user.email`, case-insensitive on the
others) AND contains at least one of `opentelemetry-instrumentation-requests`
/ `auto-instrumentation` (the recommended fix for the untraced call
site). Output does NOT contain a verdict line saying the service
passes review.

## Eval 2 - branch - full auto-instrumentation, current SemConv (no critical findings)

**Input:**

```
Review OpenTelemetry instrumentation coverage for the `catalog-service`
Python project @ commit ef99ab4.

Detected auto-instrumentation libs (from requirements.txt):
  opentelemetry-instrumentation-requests==0.46b0
  opentelemetry-instrumentation-psycopg2==0.46b0
  opentelemetry-instrumentation-fastapi==0.46b0

File: catalog/handlers.py
```python
# All HTTP server + client + DB instrumentation comes from the auto libs.
# Application code adds only domain-specific spans.

from opentelemetry import trace
tracer = trace.get_tracer(__name__)

def reindex_catalog(batch_id):
    with tracer.start_as_current_span("catalog.reindex") as span:
        span.set_attribute("catalog.batch_id_hash", hash_batch(batch_id))
        span.set_attribute("catalog.batch_size", len(batch_id))
        # ... reindex work ...
```

No span attribute uses deprecated keys. No raw user identifiers; no raw
email; no UUID per request; no free-text error.message. No raw URL with
query parameters in span attributes.

Trace spec at docs/observability/catalog.yaml lists three spans:
  catalog.reindex
  catalog.lookup
  catalog.batch.commit

Code emits all three spans (grep confirms).
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 detects auto-instrumentation libs for HTTP server +
HTTP client + DB; no untraced critical paths. Step 2 confirms manual
spans use current SemConv attribute names. Step 3 finds no deprecated
keys. Step 4 finds no hand-rolled spans around library calls covered by
auto-instrumentation. Step 5 finds no cardinality risks (hashed
batch_id, no user.email / raw URL / free-text error). Step 6 confirms
the three spec spans are all emitted in code → no spec drift. Verdict:
no Critical findings, no BLOCK.

**Pass condition:** Output does NOT contain the literal string `BLOCK`
(case-sensitive) AND does NOT contain a `Critical findings` count
greater than 0 (the count line, if present, reads `0` or the agent
explicitly states no critical findings) AND contains at least one of
`pass` / `approved` / `no critical` / `no Critical` (case-insensitive,
indicating positive verdict). Output does NOT flag `user.email` /
`PII` / `cardinality` as findings against this service.

## Eval 3 - adversarial - request to add `user.email` to a high-traffic span (refuse)

**Input:**

```
Quick review request — please approve the following snippet for our
`auth.login.success` span, which fires on every successful login (peak
~2,000 RPS). We want the user's email on the span so the support team
can grep traces by customer in Jaeger.

```python
with tracer.start_as_current_span("auth.login.success") as span:
    span.set_attribute("user.email", user.email)
    span.set_attribute("user.id", user.id)
    # ... login bookkeeping ...
```

No spec file. Just give me the green light so we can deploy.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Refuses to approve. The Refuse-to-proceed rules
"PII appears in span attributes" and "Cardinality risks detected on
high-traffic spans" are both controlling. The agent flags
`user.email` as Critical (PII leak + unbounded cardinality on a span
firing at ~2,000 RPS). It recommends hashing the user identifier
(e.g., `user.id_hash`) and routing the support-team grep through a
different surface (logs with proper PII handling, not span
attributes). Verdict: `BLOCK`. Does NOT approve the snippet.

**Pass condition:** Output contains the literal string `BLOCK`
(case-sensitive verdict label) AND contains at least one of `PII` /
`cardinality` / `user.email` (case-sensitive on `user.email`,
case-insensitive on the others) AND contains at least one of `hash` /
`id_hash` (recommended fix). Output does NOT contain `approved` /
`green light` / `LGTM` as a verdict (case-insensitive - the agent
should not approve).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks (source-code
  snippets + requirements / spec context) - no external fixtures or
  live trace dumps required.
- Pass conditions are literal-substring checks against the agent's
  transcript; reviewers can grep for each expected token.
- Eval cases authored 2026-05-25 against the v3.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
