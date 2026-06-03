---
component: defect-clusterer
type: agent
---

# defect-clusterer - evals

Companion eval cases for [`defect-clusterer`](../../defect-clusterer.md).
Three cases cover happy path / branch / adversarial: top-frame clustering
of a duplicate storm (strongest signal), generic-error-only inputs that
force `HUMAN REVIEW NEEDED` (medium signal), and stack-trace-less UI bug
reports the agent must refuse to auto-cluster. Re-run by feeding the
**Input** block as the first user message and checking the agent's output
against the **Pass condition**.

## Eval 1 - happy path - top-frame duplicate cluster (strongest signal)

**Input:**

```
Triage backlog from Linear, last 48 hours. We have 8 open bug reports.
Each report's first code block contains the error + stack frame. Cluster
them and pick a representative.

LIN-1001 — Checkout crash on cart submit
```
TypeError: Cannot read properties of undefined (reading 'amount')
    at calculateTotal (src/checkout/total.ts:23:18)
```

LIN-1002 — Subscription renewal error
```
TypeError: Cannot read properties of undefined (reading 'amount')
    at calculateTotal (src/checkout/total.ts:23:18)
```

LIN-1003 — Cart total fails for empty cart
```
TypeError: Cannot read properties of undefined (reading 'amount')
    at calculateTotal (src/checkout/total.ts:23:18)
```

LIN-1004 — "amount" undefined on checkout
```
TypeError: Cannot read properties of undefined (reading 'amount')
    at calculateTotal (src/checkout/total.ts:23:18)
```

LIN-1005 — Renewal flow 500
```
TypeError: Cannot read properties of undefined (reading 'amount')
    at calculateTotal (src/checkout/total.ts:23:18)
```

LIN-1006 — Empty cart breaks
```
TypeError: Cannot read properties of undefined (reading 'amount')
    at calculateTotal (src/checkout/total.ts:23:18)
```

LIN-1007 — Image carousel broken on /products
```
Error: Element with selector ".carousel__item--active" not found
```

LIN-1008 — Image carousel won't advance on /products
```
Error: Element with selector ".carousel__item--active" not found
```

All eight reports were filed in the last 48 hours.
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25), opus (2026-05-25)

**Expected:** Step 1 ingests the eight reports. Step 2 extracts the top
app frame `src/checkout/total.ts:23` from six of them and the carousel
selector signature from the remaining two. Step 3 produces two clusters
via top-frame match (strongest signal): cluster C1 = LIN-1001..LIN-1006
(6 members) keyed on `total.ts:23`; cluster C2 = LIN-1007 + LIN-1008
(2 members) keyed on the carousel error + route. Step 4 picks a
representative for each cluster - typically the most-detailed report or
the earliest by timestamp; LIN-1001 (or another C1 member) is the
checkout representative. The recommended action for C1 is "fix once via
the representative; close the rest as dupes after confirming the same
fingerprint." Neither cluster is flagged `HUMAN REVIEW NEEDED` - both
match on the strongest signal.

**Pass condition:** Output contains a cluster table AND mentions
`total.ts:23` (the top-frame fingerprint of C1) AND lists at least 6
members for the checkout cluster. Output does NOT flag the C1 cluster as
`HUMAN REVIEW NEEDED` (top-frame match is the strongest signal, no
human review needed).

## Eval 2 - branch - generic error, no top frame (medium signal, human review needed)

**Input:**

```
Triage backlog: 5 bug reports filed over the last week. All five report a
generic timeout. None has a stack trace. The affected routes differ.

LIN-2001 — Checkout request timed out
```
Error: ECONNRESET - request to /api/checkout timed out after 30000ms
```
Route: /api/checkout

LIN-2002 — Profile load timed out
```
Error: ECONNRESET - request to /api/profile timed out after 30000ms
```
Route: /api/profile

LIN-2003 — Search timed out
```
Error: ECONNRESET - request to /api/search timed out after 30000ms
```
Route: /api/search

LIN-2004 — Settings save timed out
```
Error: ECONNRESET - request to /api/settings timed out after 30000ms
```
Route: /api/settings

LIN-2005 — Image upload timed out
```
Error: ECONNRESET - request to /api/uploads timed out after 30000ms
```
Route: /api/uploads
```

**Target models:** sonnet (2026-05-25), haiku (2026-05-25)

**Expected:** Step 2 extracts normalized error `ECONNRESET request to
<route> timed out after 30000ms` from each report (timestamps and IDs
stripped). No top app frame is available - no stack traces. Per the
clustering rules, error-alone match is **Medium** strength - flag for
human review. Step 3 emits 5 separate clusters (one per route) rather
than collapsing into one (per the conservative default: prefer
false-singletons over false-clusters). Each cluster is flagged `HUMAN
REVIEW NEEDED` with the caveat "ECONNRESET is a generic error - these
may be unrelated infrastructure / route-specific bugs rather than a
single root cause." The example block of the agent body explicitly
covers this shape ("5 bugs all reporting 'request timed out' on
different routes").

**Pass condition:** Output contains the literal string `HUMAN REVIEW
NEEDED` (case-sensitive) AND emits more than 1 cluster (not a single
collapsed cluster). Output does NOT collapse all 5 reports into one
cluster (the agent's conservative default rejects that).

## Eval 3 - adversarial - stack-trace-less UI bugs, ambiguous prose (refuse to cluster)

**Input:**

```
Triage backlog from the support inbox. Three reports filed today, all
from the in-app feedback widget. No stack traces. The user-written
descriptions are below verbatim.

SUPPORT-1 — "the button doesn't work"
  When I click it nothing happens. Tried Chrome and Edge. App version 4.2.

SUPPORT-2 — "Save button broken"
  Pressed Save, got no feedback. Lost my changes.

SUPPORT-3 — "won't submit"
  The form just sits there after I click submit. Nothing loads.

No URL, no route, no error code captured. No screenshot, no stack trace.
```

**Target models:** sonnet (2026-05-25)

**Expected:** Step 2 finds no normalized error, no top app frame, no
affected URL or route. Per the Limitations section ("UI bugs ('button
doesn't work') rarely have either trace or distinguishing route"), the
agent does NOT auto-cluster these. It emits 3 separate singletons and
explicitly flags the input as ambiguous - recommending the upstream
[`bug-report-template`](../skills/bug-report-template/SKILL.md) /
[`bug-report-from-recording`](../bug-report-from-recording.md) flow to
gather more evidence (stack trace, URL, screenshot) before clustering.
Per the conservative default, false-singletons are preferred over false-
clusters; the agent must NOT merge these into one cluster on the basis
of "all three say a button doesn't work."

**Pass condition:** Output contains the substring `bug-report-template`
OR `bug-report-from-recording` (recommending evidence collection). Output
does NOT collapse SUPPORT-1, SUPPORT-2, and SUPPORT-3 into a single
cluster. Output does NOT claim a strong-signal match (no `Top frame
match` / `Strongest` substring tied to these reports).

## Reproducibility notes

- All three inputs are concrete pasted-content blocks - no external
  tracker exports, no need to install jq fixtures.
- Pass conditions are literal-string checks; a reviewer can grep the
  agent's transcript for each substring.
- Eval cases were authored 2026-05-25 against the v4.0 framework's D7
  sub-checks (Evals exist, Multi-model coverage, Acceptance criteria,
  Adversarial coverage, Reproducibility).
