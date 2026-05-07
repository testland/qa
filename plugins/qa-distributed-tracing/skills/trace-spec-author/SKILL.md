---
name: trace-spec-author
description: "Build a trace specification document per feature — defines the trace shape (root span + child spans + key attributes per OpenTelemetry semantic conventions) that production code MUST emit. The spec drives both implementation reviews AND trace-assertion tests, so a single declarative document is the source of truth for what observability \"looks like\" for a feature."
type: skill
archetype: S3
rating: 23
d6: 4
keywords:
  - trace-specification
  - observability-spec
  - opentelemetry
  - semantic-conventions
  - instrumentation-design
---

# trace-spec-author

Builds a per-feature trace specification document. The spec is
canonical input for: (a) implementation review during code review,
(b) trace-shape regression tests via `opentelemetry-trace-assertions`
and `jaeger-trace-tests`, (c) onboarding for new team members.

## When to use

- Starting observability for a new feature.
- Auditing existing instrumentation that grew organically.
- Pre-incident-review prep (spec gaps explain why a debugging
  session was painful).

## Step 1 — Spec template

Save under `docs/observability/<feature>.md`:

```markdown
# Trace Spec: <Feature>

**Owner:** team-checkout
**Status:** active | draft | deprecated
**Last reviewed:** YYYY-MM-DD
**Implementations:** orders-svc 1.4+, payments-svc 2.1+

## Root span

| Field | Value |
|---|---|
| name | `order.create` |
| kind | `INTERNAL` |
| status semantics | OK on 2xx, ERROR on 4xx + 5xx |

### Required attributes

| Attribute | Type | Source | Notes |
|---|---|---|---|
| `order.id` | string | UUID v4 | |
| `order.item_count` | int | int.between(1, 1000) | |
| `customer.id` | string | low-cardinality hash, never PII | |

## Child spans

### `db.query` (when persisting order)

| Field | Value |
|---|---|
| name | `db.query` |
| kind | `CLIENT` |
| parent | `order.create` |

Attributes per [OpenTelemetry DB semantic conventions]:

| Attribute | Type | Notes |
|---|---|---|
| `db.system` | string | "postgresql" |
| `db.operation` | string | "INSERT" |

### `payments.charge` (cross-service)

| Field | Value |
|---|---|
| name | `payments.charge` |
| kind | `CLIENT` (in orders-svc); peer is `SERVER` in payments-svc |
| parent | `order.create` |

Attributes:
- `payment.amount_cents` (int)
- `payment.currency` (string, ISO 4217)
- per [OpenTelemetry HTTP semantic conventions]: `http.request.method`, `url.full`, `http.response.status_code`

## Status mapping

| Outcome | Span status | Notes |
|---|---|---|
| Success (2xx) | OK | |
| Validation error (4xx) | UNSET on server side; ERROR on client side | Per [HTTP semantic conventions] |
| Server error (5xx) | ERROR | Always |

## Required test assertions

- [ ] root span name == `order.create`
- [ ] root span has all required attrs
- [ ] `db.query` is child of root
- [ ] `payments.charge` is child of root
- [ ] On 5xx from payments, `payments.charge.status == ERROR` AND `order.create.status == ERROR`
- [ ] `payment.amount_cents` always set when payment succeeds

## Change log

| Date | Change | Reviewer |
|---|---|---|
| 2026-04-01 | Initial spec | @reviewer |
| 2026-04-15 | Added `customer.id` low-cardinality req | @reviewer |
```

## Step 2 — Map to OpenTelemetry semantic conventions

For each span, decide:

1. Is there a SemConv-defined span type (HTTP, DB, messaging,
   FaaS, RPC)? Use SemConv attribute names — never invent
   parallels.
2. Is the span domain-specific (e.g., `order.create`)? Use a
   namespaced name + custom attributes (e.g., `order.id`,
   `order.item_count`).

Per the [OpenTelemetry HTTP semantic conventions], required
attributes for HTTP client spans: `http.request.method`,
`url.full`, `server.address`, `server.port`,
`http.response.status_code`, `error.type` (conditionally).

## Step 3 — Status semantics

Decide per outcome (referenced in your test spec):

| HTTP outcome | Server span | Client span |
|---|---|---|
| 1xx, 2xx, 3xx | UNSET | UNSET |
| 4xx | UNSET | ERROR |
| 5xx | ERROR | ERROR |

Per the [OpenTelemetry HTTP semantic conventions]: *"Status remains
unset for 1xx, 2xx, and 3xx responses unless additional errors
occurred. For 4xx codes, status stays unset on servers but should
be set to Error on clients. All 5xx responses should be marked as
Error."*

## Step 4 — Anti-cardinality rules (mandatory)

The spec MUST flag attributes that risk cardinality explosion in
your observability backend:

| Risk | Example | Mitigation |
|---|---|---|
| User ID as attribute → unbounded series | `user.id: 123e4567-...` | Hash to bucket OR put in span events instead |
| URL with query params | `url.full` includes raw `?token=...&id=999` | Use `http.route` for low-cardinality template |
| Free-text error message | `error.message: "User 123 …"` | Use `error.type` enum + log line for detail |

Add to spec: `**High-cardinality attributes:** none / [list]`.

## Step 5 — Drive tests from spec

Each "Required test assertion" in Step 1 maps to one test in
`opentelemetry-trace-assertions` (in-process) or `jaeger-trace-tests`
(cross-service):

```python
def test_order_create_required_attrs():
    with use_tracer():
        create_order(items=[item])

    spans = memory_exporter.get_finished_spans()
    root = next(s for s in spans if s.name == "order.create")

    # Per trace-spec.md required attrs
    assert "order.id" in root.attributes
    assert isinstance(root.attributes["order.item_count"], int)
    assert "customer.id" in root.attributes
    # PII protection: must not contain raw email
    assert "@" not in root.attributes["customer.id"]
```

The spec ↔ test ↔ implementation triangle is the value: any drift
between any two surfaces.

## Step 6 — Change-management process

Lock in a process:

- Spec changes require a PR review by the spec owner.
- Backwards-incompatible changes (renaming `order.id` →
  `order_id`) require: (a) emit both during transition, (b)
  update consumers, (c) remove old after observation period.
- Each spec has a `Last reviewed` date; quarterly review enforced
  via CODEOWNERS or a calendar nudge.

## Step 7 — Spec catalog

Maintain `docs/observability/INDEX.md`:

```markdown
| Feature | Spec | Owner | Status |
|---|---|---|---|
| Order create | [order-create.md](./order-create.md) | @team-checkout | active |
| User signup | [user-signup.md](./user-signup.md) | @team-identity | active |
| Refund flow | [refund.md](./refund.md) | @team-payments | draft |
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Spec lives in Confluence/Notion only | Drifts from code; not version-controlled | Repo-resident markdown (Step 1) |
| Spec uses prose ("emits a span when order is created") | Ambiguous; can't drive tests | Tabular required attrs + assertions (Step 1, Step 5) |
| Spec invents attribute names parallel to SemConv | Two ways to ask "what HTTP method"; analytics break | Use SemConv (Step 2) |
| Skip cardinality review | Bills surge from per-user spans | Mandatory cardinality section (Step 4) |
| No status semantics | Each implementer decides; alerts fire inconsistently | Status table (Step 3) |

## Limitations

- This skill is a *process artifact*, not a code template. Adapt
  the template fields to your domain.
- Spec discipline requires team buy-in; one team's spec doesn't
  enforce another team's instrumentation.

## References

- [OpenTelemetry traces concept docs] — span model, kind, status
- [OpenTelemetry HTTP semantic conventions] — required HTTP attrs
- [OpenTelemetry DB semantic conventions] — required DB attrs (consult docs site for current page)
- [`opentelemetry-trace-assertions`](../opentelemetry-trace-assertions/SKILL.md),
  [`jaeger-trace-tests`](../jaeger-trace-tests/SKILL.md) — sister skills
  that enforce spec conformance
- [`trace-coverage-reviewer`](../../agents/trace-coverage-reviewer.md) — agent that
  audits spec ↔ implementation drift

[OpenTelemetry traces concept docs]: https://opentelemetry.io/docs/concepts/signals/traces/
[OpenTelemetry HTTP semantic conventions]: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
[OpenTelemetry DB semantic conventions]: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
[HTTP semantic conventions]: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
