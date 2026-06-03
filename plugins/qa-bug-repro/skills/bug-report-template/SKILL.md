---
name: bug-report-template
description: "Builds a well-formed bug (defect) report from raw observation notes - fills in summary, environment, steps to reproduce, expected vs actual, and severity rationale. Validates that each field has the load-bearing content reviewers and engineers need to triage. Use when a stakeholder reports a problem informally (chat, email, voice) and the team needs a triageable issue without round-tripping for missing fields."
rating: 24
d6: 4
---

# bug-report-template

## Overview

A well-formed bug report is the input contract for triage, repro, and
fix. Industry consensus from Mozilla's long-standing bug-writing
guide ([mozilla-bug-writing][moz]) and the ISO/IEC/IEEE 29119-3:2021
incident-report format converges on the same eight fields:

[moz]: https://bugzilla.mozilla.org/page.cgi?id=bug-writing.html

| Field             | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| **Summary**       | Triage line - describes the problem, not the cause.         |
| **Environment**   | OS, build, browser/runtime version, locale, device.         |
| **Steps to Reproduce** | Numbered, deterministic, copy-pasteable.              |
| **Expected**      | What should have happened.                                  |
| **Actual**        | What did happen (verbatim error message if any).            |
| **Severity**      | Impact on users (intrinsic to the bug).                     |
| **Priority**      | Order of fix relative to other bugs (extrinsic, business).  |
| **Reproducibility** | Always / Sometimes / Once / Unable.                       |

> **Terminology note:** ISTQB distinguishes **error** (human action),
> **defect / fault / bug** (imperfection in a work product), and
> **failure** (deviation from delivered service). This skill uses
> "bug" and "defect" interchangeably with "fault" reserved for the
> code-level imperfection. Reports describe **failures** and the
> reporter's hypothesis about the underlying **defect**.

The skill is a workflow that takes raw input (a chat message, a voice
memo transcription, a copy-pasted error) and produces a filled
template - refusing to leave any required field blank.

## When to use

- A stakeholder describes a problem informally and wants it tracked.
- The team is migrating triage to a structured tracker (Linear,
  Jira, GitHub Issues) and needs a per-template template.
- A support ticket lacks the structure engineering needs.
- You're preparing a postmortem for an incident-tier bug and need a
  clean baseline report to anchor the timeline.

If the team already has a working bug template in their tracker, this
skill is **not** for replacing it - it's for **filling** it correctly.
Adapt the field set below to the team's existing template.

## Step 1 - Extract raw evidence

From the input (chat message, error log, screenshot caption, voice
memo), extract:

- **Verbatim error messages** (with quotation marks).
- **The exact UI surface** (URL or screen name) where the issue was
  observed.
- **Any environmental details** the reporter mentioned (OS, browser,
  app version).
- **What the reporter expected** vs. **what they observed** - 
  separately. Often the reporter conflates these; tease them apart.

If any of these is missing, **flag the gap** rather than fabricating;
the gap is a triage signal in itself.

## Step 2 - Draft the Summary

Per Mozilla's guidance, summaries should be **under 60 characters**
and describe the **problem, not the solution** ([mozilla-bug-writing][moz]).

| Anti-pattern                                       | Better                                              |
|----------------------------------------------------|-----------------------------------------------------|
| `Need to add cookies banner`                       | `Cookie consent banner missing on /pricing`         |
| `Fix the login form`                               | `Login form rejects valid email with apostrophe`    |
| `Bug in checkout`                                  | `Checkout returns 500 when shipping address is empty` |

A good summary names the **surface** (URL/screen) and the **observable
behavior** (what's wrong).

## Step 3 - Build the Steps to Reproduce

Per [mozilla-bug-writing][moz], reproduction steps must be:

- **Numbered** in execution order.
- **Specific** - exact buttons, exact URLs, exact input values.
- **Deterministic** - no "around step 5 it sometimes...".
- **Self-contained** - start from a known state (logged out, fresh
  browser session).

Example contrasting good vs. bad:

```
Bad:
1. Go to the site and try to check out.

Good:
1. Open https://example.com/ in Firefox 128 (private window).
2. Click "Add to cart" on the first product card.
3. Click the cart icon (top right).
4. Click "Checkout".
5. Leave the shipping address fields empty.
6. Click "Place order".
```

If the bug is **intermittent**, document the reproduction rate ("8 out
of 20 attempts on macOS Sonoma 14.4 / Firefox 128"). The
[`e2e-flake-bisector`](../../../qa-flake-triage/agents/e2e-flake-bisector.md)
agent works the same way - quantify the rate, don't guess.

## Step 4 - Separate Expected from Actual

Mozilla's example pattern ([mozilla-bug-writing][moz]):

```
Expected: My Inbox displays correctly.
Actual:   The page shows "Your browser does not support cookies
          (error -91)".
```

Reject blurry phrasings like "it doesn't work" or "page displays
incorrectly" - they push the cost of investigation onto the engineer
instead of the reporter.

For UI bugs, attach a screenshot as the **Actual** body. For backend
bugs, paste the exact error message + status code. If a stack trace
is available, the
[`crash-stack-trace-analyzer`](../../agents/crash-stack-trace-analyzer.md)
takes the trace as input.

## Step 5 - Pick Severity (intrinsic) and Priority (extrinsic)

Per ISO/IEC/IEEE 29119-3:2021 (incident-report content; cite by
stable standard ID - the spec is paywalled but the field semantics
are widely adopted):

**Severity** describes what the defect does to the user when it
manifests. Independent of business prioritization:

| Severity | When to use                                                       |
|----------|-------------------------------------------------------------------|
| Critical | Crash / data loss / security breach / business-stopping outage.  |
| Major    | Important feature unusable; workaround exists but is significant. |
| Moderate | Degraded UX in a non-critical surface; minor data inconsistency. |
| Minor    | Cosmetic, typo, label-only issue.                                 |

**Priority** describes when the team plans to fix:

| Priority | When to use                                                       |
|----------|-------------------------------------------------------------------|
| P0       | Drop everything; fix now; usually paired with Severity Critical. |
| P1       | Fix in the current sprint / cycle.                                |
| P2       | Fix in the next planning cycle.                                   |
| P3       | Backlog; fix opportunistically.                                   |

The two are independent: a Critical-severity bug for one user might
be P2 if the user is non-paying; a Minor-severity bug on the marketing
homepage might be P0 if launch is tomorrow.

## Step 6 - Score Reproducibility

Per [mozilla-bug-writing][moz]:

- **Always** - every attempt reproduces.
- **Sometimes** - quantify the rate (`12/20`, `~30%`).
- **Once** - observed once; cannot reproduce despite trying.
- **Unable** - reporter could not reproduce after the initial sighting.

A `Once` or `Unable` bug is **not** a candidate for fix-then-close - 
it's a candidate for adding monitoring or extending the test suite to
catch it next time.

## Output format

```markdown
## <Summary, <60 chars, problem-not-solution>

**Severity:** Critical | Major | Moderate | Minor
**Priority:** P0 | P1 | P2 | P3
**Reproducibility:** Always | Sometimes (X/Y) | Once | Unable

### Environment

- **App / Build:** <name + version + commit SHA if known>
- **OS:** <macOS 14.4 / Windows 11 23H2 / Ubuntu 24.04 / iOS 18.0>
- **Browser / Runtime:** <Firefox 128 / Chrome 130 / Node 22.5.0 / Python 3.12>
- **Locale / Timezone:** <en-US / UTC+0> (only when relevant)
- **Device / Viewport:** <iPhone 13 / 1280x800 desktop> (only when relevant)

### Steps to reproduce

1. <step>
2. <step>
3. ...

### Expected

<one sentence — what should have happened>

### Actual

<verbatim error / observed behavior; attach screenshot or log>

### Notes

<optional: any context the reporter mentioned that doesn't fit elsewhere — recent changes, why they were doing this, what they tried>
```

## Examples

### Example 1: from a Slack message

Input:

> "hey, the checkout flow is broken on mobile - i hit the place order button and nothing happens. tried twice. firefox on my phone."

The skill identifies missing fields and produces a draft with **gap
flags** for the missing data:

```markdown
## Place order button does nothing on mobile checkout

**Severity:** Major (feature unusable; needs reporter confirmation)
**Priority:** P1 (until severity is confirmed)
**Reproducibility:** Sometimes (2 attempts confirmed by reporter)

### Environment

- **App / Build:** [GAP — confirm the build / version]
- **OS:** [GAP — "my phone" — confirm iOS or Android + version]
- **Browser:** Firefox (mobile)
- **Locale / Timezone:** [GAP — only if business-logic-relevant]
- **Device:** [GAP — confirm phone model]

### Steps to reproduce

1. [GAP — confirm starting URL or screen]
2. Add a product to the cart.
3. Navigate to checkout.
4. Tap "Place order".
5. Observe: nothing happens.

### Expected

Tapping "Place order" submits the order and navigates to the
confirmation screen.

### Actual

Tapping "Place order" produces no visible response (no nav, no error,
no spinner).

### Notes

Reporter tried twice. Returning to reporter for the gaps before triage.
```

The `[GAP]` markers force the reporter to fill them in, rather than
the engineer triaging on incomplete data.

### Example 2: from a stack trace dump

Input: an automated alert with the full stack trace from production.

The skill drafts the report with **Steps to Reproduce** marked
`Unable — production crash (no manual repro yet)`, the **Actual** field
populated with the verbatim trace, and a recommended hand-off to the
[`crash-stack-trace-analyzer`](../../agents/crash-stack-trace-analyzer.md)
agent to extract a hypothesis.

## Anti-patterns

| Anti-pattern                                                | Why it fails                                                | Fix |
|-------------------------------------------------------------|-------------------------------------------------------------|-----|
| Filing without environment fields                           | Engineer cannot reproduce; bug bounces back to reporter.    | Force the GAP markers in the template; refuse to file without them. |
| Combining multiple unrelated symptoms in one bug            | Triage rate-limits - one of the symptoms gets fixed, the bug closes, and the others get lost. | Split into separate bugs; cross-link if related. |
| Severity = Priority shorthand ("Critical = P0")              | Confuses intrinsic impact with business prioritization.    | Score them independently; let the PM/engineering decide priority. |
| `Always` reproducibility on first observation               | The reporter may have triggered a one-off race condition.   | Verify "Always" with at least 5 deterministic repros before claiming it. |

## References

- [mozilla-bug-writing][moz] - Mozilla's bug-writing guide;
  practitioner-emergent canonical for summary / steps / expected /
  actual structure.
- ISO/IEC/IEEE 29119-3:2021 - incident-report content (cite by
  stable standard ID; spec is paywalled at iso.org).
- [`bug-repro-builder`](../../agents/bug-repro-builder.md) - agent
  that turns a filled template into a minimal failing test.
- [`crash-stack-trace-analyzer`](../../agents/crash-stack-trace-analyzer.md) - agent that extracts hypothesis from a stack-trace-only input.
