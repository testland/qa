---
component: bug-report-from-recording
type: agent
archetype: A2
---

# bug-report-from-recording - evals

Companion eval cases for [`bug-report-from-recording`](../../bug-report-from-recording.md).
Three cases cover happy path / branch / adversarial: producing a filled
`bug-report-template` from a Playwright trace (canonical artifact), the
HAR+console+screenshot branch when no Playwright trace is available, and
refusing to operate on a passing-test trace (no failure to report).
Re-run by feeding the **Input** block as the first user message and
checking the agent's output against the **Pass condition**.

## Eval 1 - happy path - Playwright trace.zip with failed assertion

**Input:**

```
A Playwright trace was captured from a CI failure. The recording was
started with screenshots: true, snapshots: true, sources: true. Please
emit the bug report.

Trace metadata (0-trace.metadata):
  browserName: chromium
  browserVersion: 138.0.7204.92
  channel: chromium
  viewport: { width: 1280, height: 720 }
  platform: linux x86_64
  duration: 3214 ms
  testFile: tests/cart.spec.ts:42
  testName: "adds an in-stock product to the cart"

Action sequence (0-trace.trace, last 4 entries):
  t=0     page.goto                  url=https://cart.example.com/product/SKU-001    success
  t=842   getByRole(button, Add to cart).click                                         success
  t=2147  expect(getByTestId(cart-count)).toHaveText("1")                              FAIL
  t=2147  error.message = 'Expected "1" but received "0"'

Network entries (0-trace.network, filtered to /api/cart/items):
  POST /api/cart/items → 409 Conflict
  response body: {"error":"out_of_stock","sku":"SKU-001"}

Screencast frame closest to t=2147ms: resources/screenshot-2147.jpeg

Test was run with retries=2. Both attempts failed identically.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 detects the input as `playwright-trace`. Step 2
extracts the failing action (cart-count assertion at t=2147ms), the
failing network request (`POST /api/cart/items → 409`), the verbatim
error message, the metadata block, and the screenshot frame. Step 3
fills the eight `bug-report-template` fields: **Summary** is a one-
sentence triage line naming the failing surface and the error class.
**Environment** lists Chromium 138.0.7204.92, viewport 1280x720, Linux,
`tests/cart.spec.ts:42`. **Steps to Reproduce** has declarative phrasing
(per Cucumber better-gherkin) with the selector as a sub-bullet.
**Expected** is the assertion reframed positively ("Cart count
increments to 1 and the response to POST /api/cart/items is 201").
**Actual** is the verbatim error message and the verbatim 409 response
body, quoted not paraphrased. **Severity** is medium (wrong data
displayed; valid request rejected). **Priority** is `[set by triage]`.
**Reproducibility** notes retries=2 with both attempts identical. Step
4 emits the markdown report. The agent then hands off to
[`bug-repro-builder`](../../bug-repro-builder.md) to convert the
trace into a committed failing test.

**Pass condition:** Output contains the literal string `[set by triage]`
(Priority must always be that placeholder per the refuse-to-fabricate
rule) AND contains the verbatim error or response body substring
(e.g. `out_of_stock` or `409`). Output mentions
`bug-repro-builder` (the hand-off named in the agent body).

## Eval 2 - branch - HAR + console + screenshot bundle (no Playwright trace)

**Input:**

```
A customer reported a checkout failure. The team captured artifacts
from Chrome DevTools — no Playwright trace is available. Bundle:

session.har (excerpt; HAR 1.2):
  log.browser: { name: "Chrome", version: "138.0.7204.92" }
  log.creator: { name: "Chrome DevTools", version: "138.0" }
  entries[]:
    [0] GET /                          → 200, 412ms
    [1] GET /static/app.js             → 200, 88ms
    [2] POST /api/auth/login           → 200, 134ms
    [3] POST /api/cart/items           → 500, 1240ms
        response body: {"error":"internal_error","traceId":"t-9f3a"}

console.log:
  [INFO] cart.tsx: user clicked Add to cart for SKU-002
  [ERROR] api/cart: POST /api/cart/items returned 500 (traceId=t-9f3a)
  [ERROR] cart.tsx: failed to add SKU-002 to cart, showing toast

screenshot.png: 1366x768 viewport showing toast "Something went wrong"
overlaying the product page.

URL: https://shop.example.com/product/SKU-002
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 1 detects the input shape as `har` + console +
screenshot bundle (NOT a Playwright trace). Step 2 parses
`log.entries[]`, filters to the first non-2xx response - entry [3]
`POST /api/cart/items → 500` - and extracts the response body
(`{"error":"internal_error","traceId":"t-9f3a"}`) and the matched
console errors. Step 3 fills the template: **Environment** populated
from `log.browser` and `log.creator` (Chrome 138.0.7204.92), viewport
inferred from the screenshot (1366x768). **Actual** is the verbatim
500 response body. **Expected** is the documented HTTP contract - 200
(or 201) for a successful add-to-cart. **Severity** is high (5xx).
**Priority** is `[set by triage]`. **Reproducibility** is `Once (per
this recording)`. The agent flags HAR-only as a limited input shape per
its "HAR-only inputs lose UI evidence" note - but since a screenshot
and console were also supplied, the report has enough evidence to
emit. The agent does NOT halt on the missing trace.

**Pass condition:** Output contains the substring `traceId=t-9f3a` or
`t-9f3a` (the verbatim load-bearing identifier from the response) AND
contains `[set by triage]` for Priority. Output classifies severity
as `high` (the 5xx surface).

## Eval 3 - adversarial - passing-test trace (refuse: no failure to report)

**Input:**

```
The team captured a Playwright trace from a routine green build. They
want a bug report generated "just in case." Please emit one.

Trace metadata (0-trace.metadata):
  browserName: chromium
  testFile: tests/checkout.spec.ts:18
  testName: "completes a 1-item checkout successfully"
  outcome: passed

Action sequence (0-trace.trace, last 5 entries):
  t=0     page.goto                                                  success
  t=412   getByRole(button, Add to cart).click                       success
  t=812   expect(getByTestId(cart-count)).toHaveText("1")            success
  t=1204  getByRole(button, Checkout).click                          success
  t=2014  expect(page).toHaveURL(/.*\/checkout\/success/)            success

No non-2xx network entries. No console errors. No error.message in
0-trace.stacks.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 1 detects the input as `playwright-trace`. Step 2
attempts to find a failed action or non-2xx response and finds neither - every action is `success`, the test outcome is `passed`, no console
errors, no non-2xx requests. Per the refuse-to-proceed rule "Emit a
report from a passing test recording. A passing trace has no failing
action; the agent returns `NO_FAILURE_DETECTED - recording does not
contain a failed assertion or non-2xx response`", the agent halts. It
does NOT fabricate a `Summary`, `Expected`, or `Actual`. It does NOT
emit a filled `bug-report-template` block. It returns the exact
`NO_FAILURE_DETECTED` error and recommends re-recording with an
actually failing scenario.

**Pass condition:** Output contains the literal string
`NO_FAILURE_DETECTED` (the agent's exact refuse-to-proceed token).
Output does NOT contain the `**Summary:**` heading from the
bug-report-template body (no filled report is emitted).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks describing the
  trace / HAR contents - no need to capture real `.zip` / `.har`
  fixtures. The agent reads the described structure.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
