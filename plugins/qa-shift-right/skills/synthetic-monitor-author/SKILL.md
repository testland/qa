---
name: synthetic-monitor-author
description: "Drafts a synthetic monitor configuration for one critical user journey — picks the platform (Datadog Synthetics, Pingdom, Checkly, New Relic, etc.), authors the scripted-transaction body (Playwright-style for browser checks; HTTP-step for API checks), wires the cadence (typical 1-15 min), defines per-step assertions (DOM presence, API status, response shape) and aggregate alert thresholds (consecutive-failure count + on-call routing). Use when a critical journey needs continuous-in-production verification per ISTQB-canonical shift-right (\"a test approach to test a system continuously in production\")."
rating: 23
d6: 4
archetype: S3
---

# synthetic-monitor-author

## Overview

Per [synthetic-mon-wiki][sm]:

[sm]: https://en.wikipedia.org/wiki/Synthetic_monitoring

> "**Synthetic monitoring** (also known as active monitoring or
> proactive monitoring) is a monitoring technique that is done by
> using a simulation or scripted recordings of transactions."
> ([synthetic-mon-wiki][sm])

Per the ISTQB Glossary V4.7.1, **shift right** is "a test approach
to test a system continuously in production." Synthetic monitors
are the load-bearing primitive — they exercise critical journeys
against production at a regular cadence and alert when they fail.

> "These scripts run continuously at set intervals to measure
> performance metrics like functionality, availability, and response
> time—without requiring actual traffic." ([synthetic-mon-wiki][sm])

This skill builds the configuration: which journey, how often, what
to assert, when to page.

## When to use

- A critical user journey needs production-side coverage that
  doesn't depend on real user traffic (low-traffic SaaS,
  pre-launch, off-peak verification).
- A SLO depends on a specific user-facing flow being available; the
  monitor is the SLO-evidence source.
- An incident postmortem identified "we should have caught this in
  production faster" — the monitor is the prevention.
- A regulatory requirement (uptime SLA, healthcare availability)
  needs continuous active verification.

If real-user traffic is high and well-instrumented, real-user
monitoring (RUM) is the complement — see "Synthetic vs. Real User
Monitoring" per [synthetic-mon-wiki][sm].

## Step 1 — Pick the journey

Synthetic monitors should target the **highest-business-value
journey** the team would page on at 3am if it broke. Examples:

- E-commerce: search → add to cart → checkout → confirmation.
- SaaS: log in → access primary feature → save change.
- Financial: authenticate → fetch account balance → return.
- Healthcare: log in → view a patient record → log out.

Per [synthetic-mon-wiki][sm]: "Synthetic monitoring tests commonly
used paths and critical business processes." Don't monitor every
flow — pick the 3-5 hero flows that map to the team's SLOs.

## Step 2 — Pick the platform

| Platform                        | Notes                                                                 |
|---------------------------------|----------------------------------------------------------------------|
| **Datadog Synthetics**           | Per [synthetic-mon-wiki][sm], one of the named providers. Browser + API. Good for teams already on Datadog APM. |
| **Checkly**                       | Playwright-native browser checks; API checks; CI-as-code via `checkly` CLI. |
| **Pingdom**                       | Mature; well-known; uptime + transaction.                            |
| **New Relic Synthetics**          | Synthetics-as-Code via JS scripts.                                   |
| **AWS CloudWatch Synthetics**     | Selenium-based; fits AWS-native stacks.                              |
| **Smokescreen** (open-source)     | Self-hosted; for compliance-restricted environments.                |
| **F5 Distributed Cloud Synthetic** | Per [synthetic-mon-wiki][sm], named provider.                       |

The platform decision typically follows the existing observability
stack (Datadog APM → Datadog Synthetics; New Relic → New Relic
Synthetics).

## Step 3 — Author the script (browser check)

For browser checks, Playwright-style is the de-facto standard
(Checkly natively, Datadog Synthetics increasingly):

```typescript
// monitors/checkout-journey.spec.ts (Checkly-style)
import { test, expect } from '@playwright/test';

test('checkout journey — happy path', async ({ page }) => {
  // 1. Land on home page
  await page.goto('https://example.com/');
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();

  // 2. Search and add to cart
  await page.getByRole('textbox', { name: 'Search' }).fill('BOOK-001');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'BOOK-001' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();

  // 3. Complete checkout (with synthetic test account)
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  // (Use a dedicated synthetic-test account; never user real customer data)
  await page.getByLabel('Email').fill(process.env.SYNTHETIC_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.SYNTHETIC_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 4. Place order with Stripe test card (in test mode in production!)
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Place order' }).click();

  // 5. Assert confirmation
  await expect(page.getByRole('heading', { name: /Order confirmed/i })).toBeVisible();
});
```

Use accessibility-first locators per
[`e2e-selector-quality-critic`](../../qa-test-review/agents/e2e-selector-quality-critic.md);
synthetic monitors that depend on CSS classes break on every UI
refactor.

**Critical**: synthetic monitors hit production with real APIs.
Use **dedicated synthetic test accounts** (not real customer data)
and **test-mode payment processors** so the script doesn't trigger
real charges / orders.

## Step 4 — Author the script (API check)

For API checks, HTTP-step format:

```yaml
# monitors/api-orders-flow.yml (Checkly-style; adapt per platform)
name: orders API journey
runtimeId: 2024.02
type: API
request:
  - name: 1. Get auth token
    method: POST
    url: https://api.example.com/auth/token
    headers:
      Content-Type: application/json
    body: |
      {"email": "{{SYNTHETIC_USER_EMAIL}}", "password": "{{SYNTHETIC_USER_PASSWORD}}"}
    assertions:
      - source: STATUS_CODE
        comparison: EQUALS
        target: 200
      - source: JSON_BODY
        property: $.access_token
        comparison: NOT_EMPTY
    setup: |
      // Save token for next request
      vars.set('TOKEN', response.body.access_token);

  - name: 2. List orders
    method: GET
    url: https://api.example.com/orders
    headers:
      Authorization: Bearer {{TOKEN}}
    assertions:
      - source: STATUS_CODE
        comparison: EQUALS
        target: 200
      - source: RESPONSE_TIME
        comparison: LESS_THAN
        target: 500   # ms
      - source: JSON_BODY
        property: $.orders
        comparison: IS_ARRAY

  - name: 3. Get specific order
    method: GET
    url: https://api.example.com/orders/{{TEST_ORDER_ID}}
    headers:
      Authorization: Bearer {{TOKEN}}
    assertions:
      - source: STATUS_CODE
        comparison: EQUALS
        target: 200
      - source: JSON_SCHEMA
        target: schemas/order.json
```

Per-step assertions distinguish "the API returned" from "the API
returned the right thing" — distinguish status code, response
shape, and response time.

## Step 5 — Cadence

**Default: 5 min** — matches most user journeys and fits within a
99.9% uptime SLO budget (5-min monitor with 2-failure alert rule
gives ~10 min to detection, well within ~9 hours/year of allowed
downtime). Use 1 min for the highest-criticality flows (auth,
payment, primary read) or when the SLO is 99.99%+. Use 15 min for
expensive E2E browser checks. Use 1 hour for transactions that have
side effects. Use daily for compliance / audit verification flows.

| Cadence    | Use                                                            |
|------------|----------------------------------------------------------------|
| 1 min      | Highest-criticality flows (auth, payment, primary read).        |
| 5 min      | Most user journeys (default).                                    |
| 15 min     | Lower-priority or expensive (full E2E browser checks).           |
| 1 hour     | Synthetic transactions that have side effects (only as a sanity check). |
| Daily       | Compliance / audit verification flows.                           |

Per [synthetic-mon-wiki][sm]: "These scripts run continuously at
set intervals." Match the cadence to the SLO.

## Step 6 — Alert thresholds

A single failure isn't an alert; a single failure is noise. Pattern:

- **Page if N consecutive failures** (typical N = 2 or 3).
- **Page if M-of-K window** (e.g., 3 of last 5 failed) — catches
  flapping monitors.
- **Per-region**: alert per geographic region; a single-region
  failure is often a CDN issue, not the application.
- **Per-step**: distinguish "the journey failed at step 1 (login)"
  from "the journey failed at step 4 (checkout)" — different
  on-call routing.

```yaml
# Alert config (Checkly-style)
alerts:
  channels:
    - id: pagerduty-checkout
      filters:
        steps: [4, 5]   # only checkout/confirmation steps
    - id: slack-eng
      filters:
        consecutiveFailures: 1   # any failure → Slack notify
  escalation:
    runBased: true
    consecutiveFailures: 2
    cooldownPeriod: 1h
```

## Step 7 — Locations

Run from multiple geographic regions (3-5 minimum):

- **us-east**, **us-west**, **eu-west**, **ap-southeast**, **sa-east**.

Per [synthetic-mon-wiki][sm], synthetic monitoring measures
"functionality, availability, and response time" — response time
varies dramatically by region; multi-region monitoring catches
CDN / DNS / TLS issues that single-region misses.

## Step 8 — As-code lifecycle

Treat monitors as code:

```
monitors/
├── checkout-journey.spec.ts       # browser check
├── api-orders-flow.yml             # API check
├── auth-flow.spec.ts
├── checkly.config.ts               # global config
└── README.md
```

CI pipeline (Checkly example):

```yaml
- run: npm ci
- run: npx checkly test --reporter ci   # smoke check before deploy
- run: npx checkly deploy --force        # push the configs
```

Versioning the monitors in git means: PR review on changes,
rollback if a monitor becomes flaky after a change, audit trail
for why a monitor was added / removed.

## Anti-patterns

| Anti-pattern                                                              | Why it fails                                                                   | Fix |
|---------------------------------------------------------------------------|--------------------------------------------------------------------------------|-----|
| Real customer data in synthetic monitors                                  | PII leakage; real charges; data corruption.                                    | Dedicated synthetic test accounts (Step 3). |
| Production payments triggered by monitors                                  | Real charges every minute add up; refunds are a nightmare.                    | Test-mode payment processor in production (Step 3). |
| Single-region monitoring                                                   | CDN / DNS / TLS / regional issues invisible.                                   | 3-5 regions (Step 7). |
| Page on first failure                                                      | Flake = page; on-call burnout.                                                | N consecutive failures (Step 6). |
| Single one-step alert for the whole journey                                 | "Checkout failed" — but where? Triage takes longer than fix.                  | Per-step alerts (Step 6). |
| Brittle CSS-class selectors in browser checks                              | Monitor breaks on every UI refactor; team disables.                           | Accessibility-first locators (Step 3). |
| Monitor that asserts only `status_code = 200`                              | "200 OK" with empty body / wrong shape passes; bug ships.                     | Assert response shape too (Step 4). |
| One-hour cadence on a 99.99% SLO                                            | SLO breach detected after the budget is gone.                                  | Cadence matches SLO (Step 5 table). |

## Limitations

- **Production load.** Synthetic monitors generate traffic; at very
  small scale this matters (10 monitors × 1-min cadence = 14,400
  requests/day per monitor).
- **Doesn't cover real-user diversity.** Synthetic monitors test
  what they're scripted to test; real users find what no one
  scripted. Pair with RUM.
- **Maintenance burden.** Monitors need updating when the product
  changes; broken monitors page on-call without product impact.
- **Per-platform proprietary scripting.** Datadog Synthetics scripts
  aren't Checkly scripts; lock-in is real. Prefer platforms that
  support Playwright-style scripts (more portable).

## References

- [synthetic-mon-wiki][sm] — Synthetic monitoring definition,
  active vs proactive vs real-user monitoring distinction, common
  metrics (Time to First Byte, Speed Index, Time to Interactive,
  Page Complete), named providers (Datadog, F5).
- ISTQB Glossary V4.7.1 — `https://glossary.istqb.org/en_US/term/shift-right`
  defines shift right as "A test approach to test a system
  continuously in production." (Per workspace memory: ISTQB glossary
  is JS-rendered; navigate via Playwright or real browser.)
- [`production-tester`](../../agents/production-tester.md) — agent
  variant: authors a single monitor for one critical journey.
- [`observability-to-test`](../../agents/observability-to-test.md)
  — sibling: closes the loop from "monitor failed" back to
  "regression test added."
- [`feature-flag-experiment-validator`](../feature-flag-experiment-validator/SKILL.md)
  — sibling skill: validates A/B experiments running behind flags.
- [`prod-canary-validator`](../prod-canary-validator/SKILL.md) —
  sibling: catches regressions in canary stage before full rollout.
